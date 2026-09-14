import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Empty, Alert, Button, Tooltip, message } from 'antd';
import {
  CheckCircleOutlined,
  DownOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import {
  type DiffResult,
  type DiffType,
  type InlineSpan,
  type DiffLine,
  type SplitDiffRow,
} from '../utils/diff';

interface DiffOutputProps {
  diff: DiffResult;
  viewMode: 'split' | 'unified';
  wordWrap: boolean;
  foldUnchanged: boolean;
  searchQuery: string;
  isDarkMode: boolean;
}

const FOLD_THRESHOLD = 8;
const CONTEXT_LINES = 3;

export function DiffOutput({
  diff,
  viewMode,
  wordWrap,
  foldUnchanged,
  searchQuery,
  isDarkMode,
}: DiffOutputProps) {
  // Set of expanded hunk group indices
  const [expandedHunks, setExpandedHunks] = useState<Record<string, boolean>>({});

  // Reset expanded hunks when foldUnchanged or diff changes
  useEffect(() => {
    setExpandedHunks({});
  }, [foldUnchanged, diff]);

  // Synchronized scrolling refs for Split View
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef<boolean>(false);

  const handleScroll = (source: 'left' | 'right') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    const sourceEl = source === 'left' ? leftScrollRef.current : rightScrollRef.current;
    const targetEl = source === 'left' ? rightScrollRef.current : leftScrollRef.current;

    if (sourceEl && targetEl) {
      targetEl.scrollTop = sourceEl.scrollTop;
      targetEl.scrollLeft = sourceEl.scrollLeft;
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const copyLine = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => message.success('Line copied!'))
      .catch(() => message.error('Failed to copy line'));
  };

  // Render text with search highlighting
  const renderHighlightedContent = (text: string) => {
    if (!searchQuery.trim() || !text) {
      return text;
    }

    const query = searchQuery.trim();
    const regex = new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="diff-search-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Render inline spans (word/char level diff)
  const renderSpans = (spans?: InlineSpan[], fallbackContent?: string | null) => {
    if (!spans || spans.length === 0) {
      return renderHighlightedContent(fallbackContent || ' ');
    }

    return spans.map((span, idx) => {
      if (span.type === 'added') {
        return (
          <span
            key={idx}
            className="rounded px-0.5 font-bold"
            style={{
              backgroundColor: isDarkMode
                ? 'rgba(46, 160, 67, 0.45)'
                : '#abf2bc',
              color: isDarkMode ? '#aff5b4' : '#116329',
              border: isDarkMode
                ? '1px solid rgba(63, 185, 80, 0.5)'
                : '1px solid #7ee787',
            }}
          >
            {renderHighlightedContent(span.text)}
          </span>
        );
      }
      if (span.type === 'removed') {
        return (
          <span
            key={idx}
            className="rounded px-0.5 font-bold line-through"
            style={{
              backgroundColor: isDarkMode
                ? 'rgba(248, 81, 73, 0.45)'
                : '#ffc1c0',
              color: isDarkMode ? '#ffdcd7' : '#82071e',
              border: isDarkMode
                ? '1px solid rgba(248, 81, 73, 0.5)'
                : '1px solid #ff7b72',
            }}
          >
            {renderHighlightedContent(span.text)}
          </span>
        );
      }
      return <span key={idx}>{renderHighlightedContent(span.text)}</span>;
    });
  };

  // Style helpers
  const getLineStyle = (type: DiffType): React.CSSProperties => {
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
    return {
      backgroundColor: 'transparent',
      color: isDarkMode ? '#c9d1d9' : '#24292f',
    };
  };

  const getGutterStyle = (type: DiffType): React.CSSProperties => {
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
    return {
      backgroundColor: isDarkMode ? '#1f1f1f' : '#f6f8fa',
      color: isDarkMode ? '#6e7681' : '#8c959f',
      borderRight: isDarkMode ? '1px solid #30363d' : '1px solid #d0d7de',
    };
  };

  const getPrefix = (type: DiffType) => {
    if (type === 'added') return '+';
    if (type === 'removed') return '-';
    return ' ';
  };

  // --- Hunk Folding Logic for Unified View ---
  type UnifiedItem =
    | { isHunk: false; line: DiffLine }
    | { isHunk: true; id: string; count: number; lines: DiffLine[] };

  const processedUnifiedItems: UnifiedItem[] = useMemo(() => {
    if (!foldUnchanged) {
      return diff.unified.map((line) => ({ isHunk: false, line }));
    }

    const result: UnifiedItem[] = [];
    let i = 0;
    while (i < diff.unified.length) {
      if (diff.unified[i].type !== 'unchanged') {
        result.push({ isHunk: false, line: diff.unified[i] });
        i++;
      } else {
        // Find run of unchanged lines
        let j = i;
        while (j < diff.unified.length && diff.unified[j].type === 'unchanged') {
          j++;
        }
        const runLength = j - i;
        if (runLength > FOLD_THRESHOLD) {
          // Keep top context lines
          for (let k = 0; k < CONTEXT_LINES; k++) {
            result.push({ isHunk: false, line: diff.unified[i + k] });
          }

          // Fold middle lines
          const foldedLines = diff.unified.slice(i + CONTEXT_LINES, j - CONTEXT_LINES);
          const hunkId = `unified-hunk-${i}`;
          result.push({
            isHunk: true,
            id: hunkId,
            count: foldedLines.length,
            lines: foldedLines,
          });

          // Keep bottom context lines
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
    | { isHunk: false; row: SplitDiffRow }
    | { isHunk: true; id: string; count: number; rows: SplitDiffRow[] };

  const processedSplitItems: SplitItem[] = useMemo(() => {
    if (!foldUnchanged) {
      return diff.split.map((row) => ({ isHunk: false, row }));
    }

    const result: SplitItem[] = [];
    let i = 0;
    while (i < diff.split.length) {
      const isUnchanged =
        diff.split[i].left?.type === 'unchanged' &&
        diff.split[i].right?.type === 'unchanged';

      if (!isUnchanged) {
        result.push({ isHunk: false, row: diff.split[i] });
        i++;
      } else {
        let j = i;
        while (
          j < diff.split.length &&
          diff.split[j].left?.type === 'unchanged' &&
          diff.split[j].right?.type === 'unchanged'
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

  // If no lines at all
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

  // If files are identical
  const isIdentical =
    diff.metrics.additions === 0 &&
    diff.metrics.deletions === 0 &&
    diff.metrics.unchanged > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pb-3">
      {isIdentical && (
        <div className="mb-2">
          <Alert
            message="No Differences Found"
            description="The original and modified inputs are completely identical."
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            closable
          />
        </div>
      )}

      {/* Diff Table Container */}
      <div
        className="flex-1 border rounded-lg overflow-hidden shadow-sm flex flex-col min-h-0 diff-code-font"
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
                      return item.lines.map((line) => (
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
                          <td className="px-3 py-0.5">
                            {renderSpans(line.spans, line.content)}
                          </td>
                        </tr>
                      ));
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
                          className="py-1.5 px-4 text-xs font-semibold text-center select-none border-y"
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
                            Expand {item.count} unchanged lines
                          </Button>
                        </td>
                      </tr>
                    );
                  }

                  const line = item.line;
                  return (
                    <tr
                      key={line.id || index}
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
                        <Tooltip title="Copy line">
                          <button
                            type="button"
                            onClick={() => copyLine(line.content)}
                            className="hidden group-hover:inline-flex absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                            style={{
                              backgroundColor: isDarkMode ? '#21262d' : '#ffffff',
                              border: isDarkMode ? '1px solid #30363d' : '1px solid #d0d7de',
                            }}
                          >
                            <CopyOutlined style={{ fontSize: '11px' }} />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* SPLIT VIEW WITH SYNCHRONIZED SCROLL */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane (Original) */}
            <div
              ref={leftScrollRef}
              onScroll={() => handleScroll('left')}
              className="w-1/2 overflow-auto border-r"
              style={{ borderColor: isDarkMode ? '#30363d' : '#d0d7de' }}
            >
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
                        return item.rows.map((row) => (
                          <tr
                            key={row.id}
                            style={getLineStyle(row.left ? row.left.type : 'unchanged')}
                          >
                            <td
                              className="w-12 min-w-[3rem] px-2 text-right select-none"
                              style={getGutterStyle(row.left ? row.left.type : 'unchanged')}
                            >
                              {row.left?.lineNumber}
                            </td>
                            <td
                              className="w-6 px-2 text-center select-none font-bold opacity-75"
                              style={getLineStyle(row.left ? row.left.type : 'unchanged')}
                            >
                              {row.left ? getPrefix(row.left.type) : ' '}
                            </td>
                            <td className="px-3 py-0.5">
                              {renderSpans(row.left?.spans, row.left?.content)}
                            </td>
                          </tr>
                        ));
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
                            colSpan={3}
                            className="py-1.5 px-4 text-xs font-semibold text-center select-none border-y"
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
                              Expand {item.count} lines
                            </Button>
                          </td>
                        </tr>
                      );
                    }

                    const row = item.row;
                    const left = row.left;
                    return (
                      <tr
                        key={row.id || index}
                        style={getLineStyle(left ? left.type : 'unchanged')}
                      >
                        <td
                          className="w-12 min-w-[3rem] px-2 text-right select-none"
                          style={getGutterStyle(left ? left.type : 'unchanged')}
                        >
                          {left?.lineNumber}
                        </td>
                        <td
                          className="w-6 px-2 text-center select-none font-bold opacity-75"
                          style={getLineStyle(left ? left.type : 'unchanged')}
                        >
                          {left ? getPrefix(left.type) : ' '}
                        </td>
                        <td className="px-3 py-0.5 relative group">
                          {renderSpans(left?.spans, left?.content)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Right Pane (Modified) */}
            <div
              ref={rightScrollRef}
              onScroll={() => handleScroll('right')}
              className="w-1/2 overflow-auto"
            >
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
                        return item.rows.map((row) => (
                          <tr
                            key={row.id}
                            style={getLineStyle(row.right ? row.right.type : 'unchanged')}
                          >
                            <td
                              className="w-12 min-w-[3rem] px-2 text-right select-none"
                              style={getGutterStyle(row.right ? row.right.type : 'unchanged')}
                            >
                              {row.right?.lineNumber}
                            </td>
                            <td
                              className="w-6 px-2 text-center select-none font-bold opacity-75"
                              style={getLineStyle(row.right ? row.right.type : 'unchanged')}
                            >
                              {row.right ? getPrefix(row.right.type) : ' '}
                            </td>
                            <td className="px-3 py-0.5">
                              {renderSpans(row.right?.spans, row.right?.content)}
                            </td>
                          </tr>
                        ));
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
                            colSpan={3}
                            className="py-1.5 px-4 text-xs font-semibold text-center select-none border-y"
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
                              Expand {item.count} lines
                            </Button>
                          </td>
                        </tr>
                      );
                    }

                    const row = item.row;
                    const right = row.right;
                    return (
                      <tr
                        key={row.id || index}
                        style={getLineStyle(right ? right.type : 'unchanged')}
                      >
                        <td
                          className="w-12 min-w-[3rem] px-2 text-right select-none"
                          style={getGutterStyle(right ? right.type : 'unchanged')}
                        >
                          {right?.lineNumber}
                        </td>
                        <td
                          className="w-6 px-2 text-center select-none font-bold opacity-75"
                          style={getLineStyle(right ? right.type : 'unchanged')}
                        >
                          {right ? getPrefix(right.type) : ' '}
                        </td>
                        <td className="px-3 py-0.5 relative group">
                          {renderSpans(right?.spans, right?.content)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
