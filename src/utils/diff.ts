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
  hunkHeader?: string;
}

export interface SplitDiffSide {
  lineNumber: number | null;
  content: string | null;
  type: DiffType | 'empty';
  spans?: InlineSpan[];
  isPlaceholder?: boolean;
}

export interface SplitDiffRow {
  id: string;
  left: SplitDiffSide;
  right: SplitDiffSide;
  hunkHeader?: string;
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
 * Calculates token-based Jaccard similarity between two code lines
 */
export function computeLineSimilarity(lineA: string, lineB: string): number {
  const trimA = lineA.trim();
  const trimB = lineB.trim();
  if (trimA === trimB) return 1;
  if (!trimA || !trimB) return 0;

  // Split on word boundaries, keeping tokens
  const tokensA = new Set(trimA.split(/[^a-zA-Z0-9_$]+/i).filter(Boolean));
  const tokensB = new Set(trimB.split(/[^a-zA-Z0-9_$]+/i).filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
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

/**
 * Detect language identifier for Monaco Editor from filename
 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'sql':
      return 'sql';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return 'cpp';
    default:
      return 'typescript';
  }
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

  // Track pending removed & added lines to pair them intelligently
  let pendingRemovedLines: DiffLine[] = [];
  let pendingAddedLines: DiffLine[] = [];

  const processPendingSplitLines = () => {
    if (pendingRemovedLines.length === 0 && pendingAddedLines.length === 0) {
      return;
    }

    // Similarity-based alignment:
    // If we have both removed and added lines, pair up lines that have similarity >= 0.25
    const matchedAdded = new Set<number>();
    const pairings: Array<{ removedIndex: number; addedIndex: number | null }> = [];

    for (let r = 0; r < pendingRemovedLines.length; r++) {
      const remLine = pendingRemovedLines[r];
      let bestAddedIdx = -1;
      let highestSimilarity = 0;

      for (let a = 0; a < pendingAddedLines.length; a++) {
        if (matchedAdded.has(a)) continue;
        const addLine = pendingAddedLines[a];
        const sim = computeLineSimilarity(remLine.content, addLine.content);
        if (sim > highestSimilarity && sim >= 0.25) {
          highestSimilarity = sim;
          bestAddedIdx = a;
        }
      }

      if (bestAddedIdx !== -1) {
        matchedAdded.add(bestAddedIdx);
        pairings.push({ removedIndex: r, addedIndex: bestAddedIdx });
      } else {
        // Unmatched removed line (pure deletion)
        pairings.push({ removedIndex: r, addedIndex: null });
      }
    }

    // Sort pairings by removed index, and insert matched pairs
    for (const pair of pairings) {
      const removed = pendingRemovedLines[pair.removedIndex];
      const added = pair.addedIndex !== null ? pendingAddedLines[pair.addedIndex] : null;

      if (added && granularity !== 'line') {
        const intra = computeIntraLineDiff(
          removed.content,
          added.content,
          granularity === 'char' ? 'char' : 'word'
        );
        removed.spans = intra.oldSpans;
        added.spans = intra.newSpans;
        metrics.modifications++;
      }

      split.push({
        id: `split-row-${lineCounter++}`,
        left: {
          lineNumber: removed.oldLineNumber,
          content: removed.content,
          type: 'removed',
          spans: removed.spans,
          isPlaceholder: false,
        },
        right: added
          ? {
              lineNumber: added.newLineNumber,
              content: added.content,
              type: 'added',
              spans: added.spans,
              isPlaceholder: false,
            }
          : {
              lineNumber: null,
              content: null,
              type: 'empty',
              isPlaceholder: true,
            },
      });
    }

    // Any remaining unmatched added lines are pure additions (rendered with left placeholder)
    for (let a = 0; a < pendingAddedLines.length; a++) {
      if (!matchedAdded.has(a)) {
        const added = pendingAddedLines[a];
        split.push({
          id: `split-row-${lineCounter++}`,
          left: {
            lineNumber: null,
            content: null,
            type: 'empty',
            isPlaceholder: true,
          },
          right: {
            lineNumber: added.newLineNumber,
            content: added.content,
            type: 'added',
            spans: added.spans,
            isPlaceholder: false,
          },
        });
      }
    }

    pendingRemovedLines = [];
    pendingAddedLines = [];
  };

  for (const change of changes) {
    const lines = change.value.split('\n');
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
          left: {
            lineNumber: oldLn,
            content: line,
            type: 'unchanged',
            isPlaceholder: false,
          },
          right: {
            lineNumber: newLn,
            content: line,
            type: 'unchanged',
            isPlaceholder: false,
          },
        });
        oldLn++;
        newLn++;
      }
    }
  }

  processPendingSplitLines();

  // Standard Git unified patch
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
