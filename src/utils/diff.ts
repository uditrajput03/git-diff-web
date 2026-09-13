import { diffLines } from 'diff';

export type DiffType = 'added' | 'removed' | 'unchanged';

export interface DiffLine {
  oldLineNumber: number | null;
  newLineNumber: number | null;
  type: DiffType;
  content: string;
}

export interface SplitDiffRow {
  left: { lineNumber: number | null; content: string | null; type: DiffType } | null;
  right: { lineNumber: number | null; content: string | null; type: DiffType } | null;
}

export interface DiffMetrics {
  additions: number;
  deletions: number;
  unchanged: number;
}

export interface DiffResult {
  unified: DiffLine[];
  split: SplitDiffRow[];
  metrics: DiffMetrics;
}

export function computeDiff(originalText: string, modifiedText: string, ignoreWhitespace: boolean): DiffResult {
  const changes = diffLines(originalText, modifiedText, {
    ignoreWhitespace,
  });

  const unified: DiffLine[] = [];
  const split: SplitDiffRow[] = [];
  
  const metrics: DiffMetrics = {
    additions: 0,
    deletions: 0,
    unchanged: 0,
  };

  let oldLn = 1;
  let newLn = 1;

  // Track removed lines to align them with added lines for split view
  let pendingRemovedLines: DiffLine[] = [];
  let pendingAddedLines: DiffLine[] = [];

  const processPendingSplitLines = () => {
    const maxLen = Math.max(pendingRemovedLines.length, pendingAddedLines.length);
    for (let i = 0; i < maxLen; i++) {
      const removed = pendingRemovedLines[i] || null;
      const added = pendingAddedLines[i] || null;
      split.push({
        left: removed ? { lineNumber: removed.oldLineNumber, content: removed.content, type: 'removed' } : null,
        right: added ? { lineNumber: added.newLineNumber, content: added.content, type: 'added' } : null,
      });
    }
    pendingRemovedLines = [];
    pendingAddedLines = [];
  };

  for (const change of changes) {
    // Diff returns a single string with trailing newlines for multi-line changes.
    // We split by newline, but need to handle the fact that diffLines keeps trailing newlines.
    const lines = change.value.split('\n');
    // If the last line is empty and it's because of a trailing newline, pop it.
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    for (const line of lines) {
      if (change.added) {
        metrics.additions++;
        const diffLine: DiffLine = { oldLineNumber: null, newLineNumber: newLn, type: 'added', content: line };
        unified.push(diffLine);
        pendingAddedLines.push(diffLine);
        newLn++;
      } else if (change.removed) {
        metrics.deletions++;
        const diffLine: DiffLine = { oldLineNumber: oldLn, newLineNumber: null, type: 'removed', content: line };
        unified.push(diffLine);
        pendingRemovedLines.push(diffLine);
        oldLn++;
      } else {
        metrics.unchanged++;
        processPendingSplitLines();
        const diffLine: DiffLine = { oldLineNumber: oldLn, newLineNumber: newLn, type: 'unchanged', content: line };
        unified.push(diffLine);
        split.push({
          left: { lineNumber: oldLn, content: line, type: 'unchanged' },
          right: { lineNumber: newLn, content: line, type: 'unchanged' }
        });
        oldLn++;
        newLn++;
      }
    }
  }

  processPendingSplitLines();

  return { unified, split, metrics };
}
