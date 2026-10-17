import React, { useState, useEffect, useMemo, useRef, useImperativeHandle } from 'react';
import { Empty, Alert, Button, Tooltip, App as AntdApp } from 'antd';
import {
  CheckCircleOutlined,
  DownOutlined,
  UpOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import {
  type DiffResult,
  type DiffType,
  type InlineSpan,
  type DiffLine,
  type SplitDiffRow,
  type SplitDiffSide,
} from '../utils/diff';

export interface DiffOutputNavHandle {
  nextDiff: () => void;
  prevDiff: () => void;
}

interface DiffOutputProps {
  diff: DiffResult;
  viewMode: 'split' | 'unified';
  wordWrap: boolean;
  foldUnchanged: boolean;
  searchQuery: string;
  currentMatchIndex: number;
  onMatchCountChange?: (count: number) => void;
  isDarkMode: boolean;
  navRef?: React.RefObject<DiffOutputNavHandle | null>;
}

const FOLD_THRESHOLD = 8;
const CONTEXT_LINES = 3;

// Keywords for lightweight syntax highlighting
const KEYWORDS = new Set([
  'function', 'return', 'if', 'else', 'for', 'while', 'const', 'let', 'var',
  'import', 'from', 'export', 'default', 'class', 'interface', 'type', 'extends',
  'implements', 'new', 'this', 'typeof', 'instanceof', 'async', 'await', 'try',
  'catch', 'finally', 'throw', 'switch', 'case', 'break', 'continue', 'def',
  'self', 'elif', 'print', 'select', 'where', 'insert', 'update', 'delete',
]);

const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'None', 'True', 'False']);

export function DiffOutput({
  diff,
  viewMode,
  wordWrap,
  foldUnchanged,
  searchQuery,
  currentMatchIndex,
  onMatchCountChange,
  isDarkMode,
  navRef,
}: DiffOutputProps) {
  const { message } = AntdApp.useApp();
  const [expandedHunks, setExpandedHunks] = useState<Record<string, boolean>>({});
  const [copiedLineId, setCopiedLineId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentHunkIndexRef = useRef<number>(-1);

  useEffect(() => {
    setExpandedHunks({});
    currentHunkIndexRef.current = -1;
  }, [foldUnchanged, diff, viewMode]);

  // Hunk navigation for GitHub Diff mode
  useImperativeHandle(navRef, () => ({
    nextDiff: () => {
      const container = containerRef.current;
      if (!container) return;
      const hunks = container.querySelectorAll<HTMLElement>('[data-diff-hunk]');
      if (hunks.length === 0) {
        message.info('No differences found in this view');
        return;
      }
      currentHunkIndexRef.current = (currentHunkIndexRef.current + 1) % hunks.length;
      const target = hunks[currentHunkIndexRef.current];
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('diff-hunk-focus');
      setTimeout(() => target.classList.remove('diff-hunk-focus'), 1200);
    },
    prevDiff: () => {
      const container = containerRef.current;
      if (!container) return;
      const hunks = container.querySelectorAll<HTMLElement>('[data-diff-hunk]');
      if (hunks.length === 0) {
        message.info('No differences found in this view');
        return;
      }
      currentHunkIndexRef.current =
        (currentHunkIndexRef.current - 1 + hunks.length) % hunks.length;
      const target = hunks[currentHunkIndexRef.current];
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('diff-hunk-focus');
      setTimeout(() => target.classList.remove('diff-hunk-focus'), 1200);
    },
  }));

  const copyLine = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedLineId(id);
        message.success('Line copied!');
        setTimeout(() => setCopiedLineId(null), 2000);
      })
      .catch(() => message.error('Failed to copy line'));
  };

  // Scroll to active search match
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const container = containerRef.current;
    if (!container) return;

    const timer = setTimeout(() => {
      const activeMark = container.querySelector<HTMLElement>(
        `mark[data-search-index="${currentMatchIndex}"]`
      );
      if (activeMark) {
        activeMark.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentMatchIndex, searchQuery]);

  // Synchronize search match count
  const renderedMatchCountRef = useRef(0);
  let globalMatchCounter = 0;

  // Search match highlighter + syntax highlighter
  const renderTokenizedText = (text: string) => {
    if (!text) return ' ';

    const query = searchQuery.trim();
    const tokenRegex =
      /(\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|[^\s\w]+|\s+)/g;
    const tokens = text.match(tokenRegex) || [text];

    return tokens.map((tok, i) => {
      // Check search match
      if (query && tok.toLowerCase().includes(query.toLowerCase())) {
        const escaped = query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const parts = tok.split(new RegExp(`(${escaped})`, 'gi'));
        return (
          <span key={i}>
            {parts.map((part, pIdx) => {
              if (part.toLowerCase() === query.toLowerCase()) {
                const markIdx = globalMatchCounter++;
                const isActive = markIdx === currentMatchIndex;
                return (
                  <mark
                    key={pIdx}
                    data-search-index={markIdx}
                    className={`diff-search-highlight ${
                      isActive ? 'diff-search-highlight-active' : ''
                    }`}
                  >
                    {part}
                  </mark>
                );
              }
              return part;
            })}
          </span>
        );
      }

      // Syntax token styling
      if (tok.startsWith('//') || tok.startsWith('#')) {
        return (
          <span
            key={i}
            style={{ color: isDarkMode ? '#8b949e' : '#6e7781', fontStyle: 'italic' }}
          >
            {tok}
          </span>
        );
      }
      if (
        (tok.startsWith('"') && tok.endsWith('"')) ||
        (tok.startsWith("'") && tok.endsWith("'")) ||
        (tok.startsWith('`') && tok.endsWith('`'))
      ) {
        return (
          <span key={i} style={{ color: isDarkMode ? '#a5d6ff' : '#0a3069' }}>
            {tok}
          </span>
        );
      }
      if (/^\d+(\.\d+)?$/.test(tok)) {
        return (
          <span key={i} style={{ color: isDarkMode ? '#79c0ff' : '#0550ae' }}>
            {tok}
          </span>
        );
      }
      if (KEYWORDS.has(tok)) {
        return (
          <span
            key={i}
            style={{ color: isDarkMode ? '#ff7b72' : '#cf222e', fontWeight: 600 }}
          >
            {tok}
          </span>
        );
      }
      if (LITERALS.has(tok)) {
        return (
          <span
            key={i}
            style={{ color: isDarkMode ? '#ffa657' : '#953800', fontWeight: 600 }}
          >
            {tok}
          </span>
        );
      }

      return <span key={i}>{tok}</span>;
    });
  };

  // Render spans (intra-line word/char differences)
  const renderSpans = (spans?: InlineSpan[], fallbackContent?: string | null) => {
    if (!spans || spans.length === 0) {
      return renderTokenizedText(fallbackContent || ' ');
    }

    return spans.map((span, idx) => {
      if (span.type === 'added') {
        return (
          <span
            key={idx}
            className="rounded px-0.5 font-semibold"
            style={{
              backgroundColor: isDarkMode ? 'rgba(46, 160, 67, 0.45)' : '#abf2bc',
              color: isDarkMode ? '#aff5b4' : '#116329',
              border: isDarkMode
                ? '1px solid rgba(63, 185, 80, 0.5)'
                : '1px solid #7ee787',
            }}
          >
            {renderTokenizedText(span.text)}
          </span>
        );
      }
      if (span.type === 'removed') {
        return (
          <span
            key={idx}
            className="rounded px-0.5 font-semibold line-through"
            style={{
              backgroundColor: isDarkMode ? 'rgba(248, 81, 73, 0.45)' : '#ffc1c0',
              color: isDarkMode ? '#ffdcd7' : '#82071e',
              border: isDarkMode
                ? '1px solid rgba(248, 81, 73, 0.5)'
                : '1px solid #ff7b72',
            }}
          >
            {renderTokenizedText(span.text)}
          </span>
        );
      }
      return <span key={idx}>{renderTokenizedText(span.text)}</span>;
    });
  };

  // Cell styles
  const getLineStyle = (type: DiffType | 'empty'): React.CSSProperties => {
    if (type === 'added') {
      return {
        backgroundColor: isDarkMode ? 'rgba(46, 160, 67, 0.16)' : '#e6ffed',
        color: isDarkMode ? '#e6edf3' : '#1f2328',
      };
    }
    if (type === 'removed') {
      return {
        backgroundColor: isDarkMode ? 'rgba(248, 81, 73, 0.16)' : '#ffebe9',
        color: isDarkMode ? '#e6edf3' : '#1f2328',
      };
    }
    if (type === 'empty') {
      return {
        backgroundColor: isDarkMode ? '#161b22' : '#f6f8fa',
        backgroundImage: isDarkMode
          ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 8px, transparent 8px, transparent 16px)'
          : 'repeating-linear-gradient(45deg, rgba(0,0,0,0.03), rgba(0,0,0,0.03) 8px, transparent 8px, transparent 16px)',
      };
    }
    return {
      backgroundColor: 'transparent',
      color: isDarkMode ? '#c9d1d9' : '#24292f',
    };
  };

  const getGutterStyle = (type: DiffType | 'empty'): React.CSSProperties => {
    if (type === 'added') {
      return {
        backgroundColor: isDarkMode ? 'rgba(46, 160, 67, 0.28)' : '#dafbe1',
        color: isDarkMode ? '#7ee787' : '#1a7f37',
        borderRight: isDarkMode ? '1px solid rgba(63, 185, 80, 0.3)' : '1px solid #b4f0c0',
      };
    }
    if (type === 'removed') {
      return {
        backgroundColor: isDarkMode ? 'rgba(248, 81, 73, 0.28)' : '#ffdce0',
        color: isDarkMode ? '#ff7b72' : '#cf222e',
        borderRight: isDarkMode ? '1px solid rgba(248, 81, 73, 0.3)' : '1px solid #ffc1c0',
      };
    }
    if (type === 'empty') {
      return {
        backgroundColor: isDarkMode ? '#161b22' : '#f6f8fa',
        borderRight: isDarkMode ? '1px solid #30363d' : '1px solid #d0d7de',
      };
    }
    return {
      backgroundColor: isDarkMode ? '#1f1f1f' : '#f6f8fa',
      color: isDarkMode ? '#6e7681' : '#8c959f',
      borderRight: isDarkMode ? '1px solid #30363d' : '1px solid #d0d7de',
    };
  };

  const getPrefix = (type: DiffType | 'empty') => {
    if (type === 'added') return '+';
    if (type === 'removed') return '-';
    return ' ';
  };

  // --- Hunk Folding Logic for Unified View ---
  type UnifiedItem =
    | { isHunk: false; line: DiffLine; hunkIdx?: number }
    | {
        isHunk: true;
        id: string;
        count: number;
        startLineOld: number | null;
        startLineNew: number | null;
        lines: DiffLine[];
      };

  const processedUnifiedItems: UnifiedItem[] = useMemo(() => {
    let hunkCounter = 0;
    let inChangedHunk = false;

    if (!foldUnchanged) {
      return diff.unified.map((line) => {
        if (line.type !== 'unchanged') {
          if (!inChangedHunk) {
            inChangedHunk = true;
            hunkCounter++;
          }
          return { isHunk: false, line, hunkIdx: hunkCounter };
        } else {
          inChangedHunk = false;
          return { isHunk: false, line };
        }
      });
    }

    const result: UnifiedItem[] = [];
    let i = 0;
    while (i < diff.unified.length) {
      if (diff.unified[i].type !== 'unchanged') {
        if (!inChangedHunk) {
          inChangedHunk = true;
          hunkCounter++;
        }
        result.push({ isHunk: false, line: diff.unified[i], hunkIdx: hunkCounter });
        i++;
      } else {
        inChangedHunk = false;
        let j = i;
        while (j < diff.unified.length && diff.unified[j].type === 'unchanged') {
          j++;
        }
        const runLength = j - i;
        if (runLength > FOLD_THRESHOLD) {
          for (let k = 0; k < CONTEXT_LINES; k++) {
            result.push({ isHunk: false, line: diff.unified[i + k] });
          }
          const foldedLines = diff.unified.slice(i + CONTEXT_LINES, j - CONTEXT_LINES);
          const hunkId = `unified-hunk-${i}`;
          result.push({
            isHunk: true,
            id: hunkId,
            count: foldedLines.length,
            startLineOld: foldedLines[0]?.oldLineNumber ?? null,
            startLineNew: foldedLines[0]?.newLineNumber ?? null,
            lines: foldedLines,
          });
          for (let k = j - CONTEXT_LINES; k < j; k++) {
            result.push({ isHunk: false, line: diff.unified[k] });
          }
        } else {
          for (let k = i; k < j; k++) {
            result.push({ isHunk: false, line: diff.unified[k] });
          }
        }
        i = j;
      }
    }
    return result;
  }, [diff.unified, foldUnchanged]);

  // --- Hunk Folding Logic for Split View ---
  type SplitItem =
    | { isHunk: false; row: SplitDiffRow; hunkIdx?: number }
    | {
        isHunk: true;
        id: string;
        count: number;
        startLineLeft: number | null;
        startLineRight: number | null;
        rows: SplitDiffRow[];
      };

  const processedSplitItems: SplitItem[] = useMemo(() => {
    let hunkCounter = 0;
    let inChangedHunk = false;

    if (!foldUnchanged) {
      return diff.split.map((row) => {
        const isChange = row.left.type !== 'unchanged' || row.right.type !== 'unchanged';
        if (isChange) {
          if (!inChangedHunk) {
            inChangedHunk = true;
            hunkCounter++;
          }
          return { isHunk: false, row, hunkIdx: hunkCounter };
        } else {
          inChangedHunk = false;
          return { isHunk: false, row };
        }
      });
    }

    const result: SplitItem[] = [];
    let i = 0;
    while (i < diff.split.length) {
      const isUnchanged =
        diff.split[i].left.type === 'unchanged' &&
        diff.split[i].right.type === 'unchanged';

      if (!isUnchanged) {
        if (!inChangedHunk) {
          inChangedHunk = true;
          hunkCounter++;
        }
        result.push({ isHunk: false, row: diff.split[i], hunkIdx: hunkCounter });
        i++;
      } else {
        inChangedHunk = false;
        let j = i;
        while (
          j < diff.split.length &&
          diff.split[j].left.type === 'unchanged' &&
          diff.split[j].right.type === 'unchanged'
        ) {
          j++;
        }
        const runLength = j - i;
        if (runLength > FOLD_THRESHOLD) {
          for (let k = 0; k < CONTEXT_LINES; k++) {
            result.push({ isHunk: false, row: diff.split[i + k] });
          }
          const foldedRows = diff.split.slice(i + CONTEXT_LINES, j - CONTEXT_LINES);
          const hunkId = `split-hunk-${i}`;
          result.push({
            isHunk: true,
            id: hunkId,
            count: foldedRows.length,
            startLineLeft: foldedRows[0]?.left.lineNumber ?? null,
            startLineRight: foldedRows[0]?.right.lineNumber ?? null,
            rows: foldedRows,
          });
          for (let k = j - CONTEXT_LINES; k < j; k++) {
            result.push({ isHunk: false, row: diff.split[k] });
          }
        } else {
          for (let k = i; k < j; k++) {
            result.push({ isHunk: false, row: diff.split[k] });
          }
        }
        i = j;
      }
    }
    return result;
  }, [diff.split, foldUnchanged]);

  // Report match count after render
  useEffect(() => {
    renderedMatchCountRef.current = globalMatchCounter;
    if (onMatchCountChange) {
      onMatchCountChange(globalMatchCounter);
    }
  });

  if (diff.unified.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Empty
          description="Enter or upload code in Original and Modified editors to compare"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  const isIdentical =
    diff.metrics.additions === 0 &&
    diff.metrics.deletions === 0 &&
    diff.metrics.unchanged > 0;

  const renderSideCells = (side: SplitDiffSide, isLeft: boolean, rowId: string) => {
    if (side.isPlaceholder) {
      return (
        <React.Fragment>
          <td
            className="w-12 min-w-[3rem] px-2 text-right select-none"
            style={getGutterStyle('empty')}
          />
          <td
            className="w-6 px-2 text-center select-none"
            style={getGutterStyle('empty')}
          />
          <td
            className={`px-3 py-0.5 select-none ${isLeft ? 'border-r' : ''}`}
            style={{
              ...getLineStyle('empty'),
              borderColor: isDarkMode ? '#30363d' : '#d0d7de',
            }}
          />
        </React.Fragment>
      );
    }

    const cellId = `${rowId}-${isLeft ? 'left' : 'right'}`;
    const isCopied = copiedLineId === cellId;

    return (
      <React.Fragment>
        <td
          className="w-12 min-w-[3rem] px-2 text-right select-none"
          style={getGutterStyle(side.type)}
        >
          {side.lineNumber}
        </td>
        <td
          className="w-6 px-2 text-center select-none font-bold opacity-75"
          style={getLineStyle(side.type)}
        >
          {getPrefix(side.type)}
        </td>
        <td
          className={`px-3 py-0.5 relative group ${isLeft ? 'border-r' : ''}`}
          style={{
            ...getLineStyle(side.type),
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
          }}
        >
          {renderSpans(side.spans, side.content)}
          {side.content && (
            <Tooltip title={isCopied ? 'Copied!' : 'Copy line'}>
              <button
                type="button"
                onClick={() => copyLine(side.content!, cellId)}
                className="hidden group-hover:inline-flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: isDarkMode ? '#21262d' : '#ffffff',
                  border: isDarkMode ? '1px solid #30363d' : '1px solid #d0d7de',
                  color: isCopied ? '#52c41a' : 'inherit',
                }}
              >
                {isCopied ? (
                  <CheckOutlined style={{ fontSize: '11px' }} />
                ) : (
                  <CopyOutlined style={{ fontSize: '11px' }} />
                )}
              </button>
            </Tooltip>
          )}
        </td>
      </React.Fragment>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pb-3">
      {isIdentical && (
        <div className="mb-2">
          <Alert
            message="Files are Completely Identical"
            description="The original and modified inputs match character-for-character. No additions or deletions detected."
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            closable
          />
        </div>
      )}

      {/* Diff Table Container */}
      <div
        ref={containerRef}
        className="flex-1 border rounded-lg overflow-auto shadow-sm flex flex-col min-h-0 diff-code-font relative"
        style={{
          backgroundColor: isDarkMode ? '#0d1117' : '#ffffff',
          borderColor: isDarkMode ? '#30363d' : '#d0d7de',
        }}
      >
        {viewMode === 'unified' ? (
          /* UNIFIED VIEW */
          <div className="flex-1 overflow-auto">
            <table
              className={`w-full border-collapse ${
                wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
              }`}
            >
              <tbody>
                {processedUnifiedItems.map((item, index) => {
                  if (item.isHunk) {
                    const isExpanded = expandedHunks[item.id];
                    if (isExpanded) {
                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            style={{
                              backgroundColor: isDarkMode
                                ? 'rgba(56, 139, 253, 0.15)'
                                : '#f1f8ff',
                            }}
                          >
                            <td
                              colSpan={4}
                              className="py-1 px-4 text-xs font-mono font-semibold text-center select-none border-y"
                              style={{
                                borderColor: isDarkMode ? '#30363d' : '#c8e1ff',
                                color: isDarkMode ? '#58a6ff' : '#0969da',
                              }}
                            >
                              <Button
                                type="link"
                                size="small"
                                icon={<UpOutlined />}
                                onClick={() =>
                                  setExpandedHunks((prev) => ({
                                    ...prev,
                                    [item.id]: false,
                                  }))
                                }
                              >
                                Collapse {item.count} unchanged lines (Lines @@ -
                                {item.startLineOld} +{item.startLineNew} @@)
                              </Button>
                            </td>
                          </tr>
                          {item.lines.map((line) => {
                            const isCopied = copiedLineId === line.id;
                            return (
                              <tr
                                key={line.id}
                                className="group hover:opacity-90 transition-opacity"
                                style={getLineStyle(line.type)}
                              >
                                <td
                                  className="w-12 min-w-[3rem] px-2 text-right select-none"
                                  style={getGutterStyle(line.type)}
                                >
                                  {line.oldLineNumber}
                                </td>
                                <td
                                  className="w-12 min-w-[3rem] px-2 text-right select-none"
                                  style={getGutterStyle(line.type)}
                                >
                                  {line.newLineNumber}
                                </td>
                                <td
                                  className="w-6 px-2 text-center select-none font-bold opacity-75"
                                  style={getLineStyle(line.type)}
                                >
                                  {getPrefix(line.type)}
                                </td>
                                <td className="px-3 py-0.5 relative group">
                                  {renderSpans(line.spans, line.content)}
                                  {line.content && (
                                    <Tooltip
                                      title={isCopied ? 'Copied!' : 'Copy line'}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => copyLine(line.content, line.id)}
                                        className="hidden group-hover:inline-flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                                        style={{
                                          backgroundColor: isDarkMode
                                            ? '#21262d'
                                            : '#ffffff',
                                          border: isDarkMode
                                            ? '1px solid #30363d'
                                            : '1px solid #d0d7de',
                                          color: isCopied ? '#52c41a' : 'inherit',
                                        }}
                                      >
                                        {isCopied ? (
                                          <CheckOutlined style={{ fontSize: '11px' }} />
                                        ) : (
                                          <CopyOutlined style={{ fontSize: '11px' }} />
                                        )}
                                      </button>
                                    </Tooltip>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    }
                    return (
                      <tr
                        key={item.id}
                        style={{
                          backgroundColor: isDarkMode
                            ? 'rgba(56, 139, 253, 0.15)'
                            : '#f1f8ff',
                        }}
                      >
                        <td
                          colSpan={4}
                          className="py-1 px-4 text-xs font-mono font-semibold text-center select-none border-y"
                          style={{
                            borderColor: isDarkMode ? '#30363d' : '#c8e1ff',
                            color: isDarkMode ? '#58a6ff' : '#0969da',
                          }}
                        >
                          <Button
                            type="link"
                            size="small"
                            icon={<DownOutlined />}
                            onClick={() =>
                              setExpandedHunks((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }))
                            }
                          >
                            Expand {item.count} unchanged lines (@@ -
                            {item.startLineOld} +{item.startLineNew} @@)
                          </Button>
                        </td>
                      </tr>
                    );
                  }

                  const line = item.line;
                  const isCopied = copiedLineId === line.id;
                  const isFirstLineOfHunk =
                    item.hunkIdx !== undefined &&
                    (index === 0 ||
                      (processedUnifiedItems[index - 1] as { hunkIdx?: number })
                        ?.hunkIdx !== item.hunkIdx);

                  return (
                    <tr
                      key={line.id || index}
                      data-diff-hunk={isFirstLineOfHunk ? `hunk-${item.hunkIdx}` : undefined}
                      className="group hover:opacity-95 transition-opacity"
                      style={getLineStyle(line.type)}
                    >
                      <td
                        className="w-12 min-w-[3rem] px-2 text-right select-none"
                        style={getGutterStyle(line.type)}
                      >
                        {line.oldLineNumber}
                      </td>
                      <td
                        className="w-12 min-w-[3rem] px-2 text-right select-none"
                        style={getGutterStyle(line.type)}
                      >
                        {line.newLineNumber}
                      </td>
                      <td
                        className="w-6 px-2 text-center select-none font-bold opacity-75"
                        style={getLineStyle(line.type)}
                      >
                        {getPrefix(line.type)}
                      </td>
                      <td className="px-3 py-0.5 relative group">
                        {renderSpans(line.spans, line.content)}
                        {line.content && (
                          <Tooltip title={isCopied ? 'Copied!' : 'Copy line'}>
                            <button
                              type="button"
                              onClick={() => copyLine(line.content, line.id)}
                              className="hidden group-hover:inline-flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                              style={{
                                backgroundColor: isDarkMode ? '#21262d' : '#ffffff',
                                border: isDarkMode
                                  ? '1px solid #30363d'
                                  : '1px solid #d0d7de',
                                color: isCopied ? '#52c41a' : 'inherit',
                              }}
                            >
                              {isCopied ? (
                                <CheckOutlined style={{ fontSize: '11px' }} />
                              ) : (
                                <CopyOutlined style={{ fontSize: '11px' }} />
                              )}
                            </button>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* SPLIT VIEW - SINGLE UNIFIED TABLE (100% Monotonic Line Alignment) */
          <div className="flex-1 overflow-auto">
            <table
              className={`w-full border-collapse ${
                wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
              }`}
            >
              <tbody>
                {processedSplitItems.map((item, index) => {
                  if (item.isHunk) {
                    const isExpanded = expandedHunks[item.id];
                    if (isExpanded) {
                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            style={{
                              backgroundColor: isDarkMode
                                ? 'rgba(56, 139, 253, 0.15)'
                                : '#f1f8ff',
                            }}
                          >
                            <td
                              colSpan={6}
                              className="py-1 px-4 text-xs font-mono font-semibold text-center select-none border-y"
                              style={{
                                borderColor: isDarkMode ? '#30363d' : '#c8e1ff',
                                color: isDarkMode ? '#58a6ff' : '#0969da',
                              }}
                            >
                              <Button
                                type="link"
                                size="small"
                                icon={<UpOutlined />}
                                onClick={() =>
                                  setExpandedHunks((prev) => ({
                                    ...prev,
                                    [item.id]: false,
                                  }))
                                }
                              >
                                Collapse {item.count} unchanged lines (Lines @@ -
                                {item.startLineLeft} +{item.startLineRight} @@)
                              </Button>
                            </td>
                          </tr>
                          {item.rows.map((row) => (
                            <tr
                              key={row.id}
                              className="hover:opacity-95 transition-opacity"
                            >
                              {renderSideCells(row.left, true, row.id)}
                              {renderSideCells(row.right, false, row.id)}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    }
                    return (
                      <tr
                        key={item.id}
                        style={{
                          backgroundColor: isDarkMode
                            ? 'rgba(56, 139, 253, 0.15)'
                            : '#f1f8ff',
                        }}
                      >
                        <td
                          colSpan={6}
                          className="py-1 px-4 text-xs font-mono font-semibold text-center select-none border-y"
                          style={{
                            borderColor: isDarkMode ? '#30363d' : '#c8e1ff',
                            color: isDarkMode ? '#58a6ff' : '#0969da',
                          }}
                        >
                          <Button
                            type="link"
                            size="small"
                            icon={<DownOutlined />}
                            onClick={() =>
                              setExpandedHunks((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }))
                            }
                          >
                            Expand {item.count} unchanged lines (@@ -
                            {item.startLineLeft} +{item.startLineRight} @@)
                          </Button>
                        </td>
                      </tr>
                    );
                  }

                  const row = item.row;
                  const isFirstLineOfHunk =
                    item.hunkIdx !== undefined &&
                    (index === 0 ||
                      (processedSplitItems[index - 1] as { hunkIdx?: number })
                        ?.hunkIdx !== item.hunkIdx);

                  return (
                    <tr
                      key={row.id || index}
                      data-diff-hunk={isFirstLineOfHunk ? `hunk-${item.hunkIdx}` : undefined}
                      className="hover:opacity-95 transition-opacity"
                    >
                      {renderSideCells(row.left, true, row.id)}
                      {renderSideCells(row.right, false, row.id)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
