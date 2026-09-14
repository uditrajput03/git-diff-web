import {
  diffLines,
  diffWordsWithSpace,
  diffChars,
  createTwoFilesPatch,
  type Change,
} from 'diff';

export type DiffType = 'added' | 'removed' | 'unchanged';
export type Granularity = 'line' | 'word' | 'char';

export interface InlineSpan {
  type: DiffType;
  text: string;
}

export interface DiffLine {
  id: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  type: DiffType;
  content: string;
  spans?: InlineSpan[];
}

export interface SplitDiffSide {
  lineNumber: number | null;
  content: string | null;
  type: DiffType;
  spans?: InlineSpan[];
}

export interface SplitDiffRow {
  id: string;
  left: SplitDiffSide | null;
  right: SplitDiffSide | null;
}

export interface DiffMetrics {
  additions: number;
  deletions: number;
  unchanged: number;
  modifications: number;
  totalOriginalLines: number;
  totalModifiedLines: number;
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  granularity?: Granularity;
}

export interface DiffResult {
  unified: DiffLine[];
  split: SplitDiffRow[];
  metrics: DiffMetrics;
  patch: string;
}

/**
 * Computes intra-line word/character difference between an old and new line.
 */
export function computeIntraLineDiff(
  oldText: string,
  newText: string,
  granularity: 'word' | 'char' = 'word'
): { oldSpans: InlineSpan[]; newSpans: InlineSpan[] } {
  const diffFn = granularity === 'char' ? diffChars : diffWordsWithSpace;
  const changes = diffFn(oldText, newText);

  const oldSpans: InlineSpan[] = [];
  const newSpans: InlineSpan[] = [];

  for (const part of changes) {
    if (part.added) {
      newSpans.push({ type: 'added', text: part.value });
    } else if (part.removed) {
      oldSpans.push({ type: 'removed', text: part.value });
    } else {
      oldSpans.push({ type: 'unchanged', text: part.value });
      newSpans.push({ type: 'unchanged', text: part.value });
    }
  }

  return { oldSpans, newSpans };
}

export function computeDiff(
  originalText: string,
  modifiedText: string,
  options: DiffOptions = {}
): DiffResult {
  const {
    ignoreWhitespace = false,
    ignoreCase = false,
    granularity = 'word',
  } = options;

  // Custom comparator for ignoreCase / ignoreWhitespace if requested
  const comparator = (a: string, b: string): boolean => {
    let left = a;
    let right = b;
    if (ignoreWhitespace) {
      left = left.trim();
      right = right.trim();
    }
    if (ignoreCase) {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }
    return left === right;
  };

  const diffConfig: { ignoreWhitespace?: boolean; comparator?: (a: string, b: string) => boolean } = {};
  if (ignoreCase || ignoreWhitespace) {
    diffConfig.comparator = comparator;
  }

  const changes: Change[] = diffLines(originalText, modifiedText, diffConfig);

  const unified: DiffLine[] = [];
  const split: SplitDiffRow[] = [];

  const metrics: DiffMetrics = {
    additions: 0,
    deletions: 0,
    unchanged: 0,
    modifications: 0,
    totalOriginalLines: originalText ? originalText.split('\n').length : 0,
    totalModifiedLines: modifiedText ? modifiedText.split('\n').length : 0,
  };

  let oldLn = 1;
  let newLn = 1;
  let lineCounter = 0;

  // Track pending removed & added lines to pair them for split view and intra-line word diffing
  let pendingRemovedLines: DiffLine[] = [];
  let pendingAddedLines: DiffLine[] = [];

  const processPendingSplitLines = () => {
    const maxLen = Math.max(pendingRemovedLines.length, pendingAddedLines.length);

    for (let i = 0; i < maxLen; i++) {
      const removed = pendingRemovedLines[i] || null;
      const added = pendingAddedLines[i] || null;

      let leftSpans: InlineSpan[] | undefined;
      let rightSpans: InlineSpan[] | undefined;

      // If both a removed and added line exist at this row index, compute word/char diff
      if (removed && added && granularity !== 'line') {
        const intra = computeIntraLineDiff(
          removed.content,
          added.content,
          granularity === 'char' ? 'char' : 'word'
        );
        leftSpans = intra.oldSpans;
        rightSpans = intra.newSpans;
        removed.spans = leftSpans;
        added.spans = rightSpans;
        metrics.modifications++;
      }

      split.push({
        id: `split-row-${lineCounter++}`,
        left: removed
          ? {
              lineNumber: removed.oldLineNumber,
              content: removed.content,
              type: 'removed',
              spans: leftSpans,
            }
          : null,
        right: added
          ? {
              lineNumber: added.newLineNumber,
              content: added.content,
              type: 'added',
              spans: rightSpans,
            }
          : null,
      });
    }

    pendingRemovedLines = [];
    pendingAddedLines = [];
  };

  for (const change of changes) {
    const lines = change.value.split('\n');
    // Pop trailing empty string caused by split on trailing newline
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    for (const line of lines) {
      if (change.added) {
        metrics.additions++;
        const diffLine: DiffLine = {
          id: `line-${lineCounter++}`,
          oldLineNumber: null,
          newLineNumber: newLn,
          type: 'added',
          content: line,
        };
        unified.push(diffLine);
        pendingAddedLines.push(diffLine);
        newLn++;
      } else if (change.removed) {
        metrics.deletions++;
        const diffLine: DiffLine = {
          id: `line-${lineCounter++}`,
          oldLineNumber: oldLn,
          newLineNumber: null,
          type: 'removed',
          content: line,
        };
        unified.push(diffLine);
        pendingRemovedLines.push(diffLine);
        oldLn++;
      } else {
        metrics.unchanged++;
        processPendingSplitLines();
        const diffLine: DiffLine = {
          id: `line-${lineCounter++}`,
          oldLineNumber: oldLn,
          newLineNumber: newLn,
          type: 'unchanged',
          content: line,
        };
        unified.push(diffLine);
        split.push({
          id: `split-row-${lineCounter++}`,
          left: { lineNumber: oldLn, content: line, type: 'unchanged' },
          right: { lineNumber: newLn, content: line, type: 'unchanged' },
        });
        oldLn++;
        newLn++;
      }
    }
  }

  processPendingSplitLines();

  // Generate standard Git unified patch
  const patch = createTwoFilesPatch(
    'a/original',
    'b/modified',
    originalText,
    modifiedText,
    'original',
    'modified'
  );

  return { unified, split, metrics, patch };
}

/**
 * Downloads a string content as a local file in browser
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
