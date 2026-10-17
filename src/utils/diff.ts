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
  originalFilename?: string;
  modifiedFilename?: string;
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
 * Clean filename by removing parenthesized annotations (e.g. " (Before)", " (v1.0)")
 */
export function cleanFilename(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/**
 * Detect language identifier for Monaco Editor from filename
 */
export function detectLanguage(filename: string): string {
  const clean = cleanFilename(filename);
  const parts = clean.split('.');
  if (parts.length <= 1) return 'plaintext';
  const ext = parts.pop()?.toLowerCase() || '';

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'json':
    case 'jsonc':
      return 'json';
    case 'py':
    case 'pyw':
      return 'python';
    case 'md':
    case 'markdown':
    case 'mdown':
      return 'markdown';
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'html':
    case 'htm':
    case 'xml':
    case 'svg':
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
    case 'kt':
    case 'scala':
      return 'java';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'c':
    case 'h':
    case 'hpp':
    case 'cs':
      return 'cpp';
    default:
      return 'plaintext';
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
    originalFilename = 'original',
    modifiedFilename = 'modified',
  } = options;

  const origLines = originalText.split('\n');
  const modLines = modifiedText.split('\n');

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
    totalOriginalLines: originalText ? origLines.length : 0,
    totalModifiedLines: modifiedText ? modLines.length : 0,
  };

  let oldLn = 1;
  let newLn = 1;
  let lineCounter = 0;

  // Track pending removed & added lines for monotonic alignment
  let pendingRemovedLines: DiffLine[] = [];
  let pendingAddedLines: DiffLine[] = [];

  const processPendingSplitLines = () => {
    if (pendingRemovedLines.length === 0 && pendingAddedLines.length === 0) {
      return;
    }

    const R = pendingRemovedLines.length;
    const A = pendingAddedLines.length;

    // Build DP table for monotonic global sequence alignment with similarity
    const dp = Array.from({ length: R + 1 }, () => new Float64Array(A + 1));
    const sim = Array.from({ length: R }, (_, r) =>
      Float64Array.from({ length: A }, (_, a) =>
        computeLineSimilarity(pendingRemovedLines[r].content, pendingAddedLines[a].content)
      )
    );

    for (let i = 1; i <= R; i++) {
      for (let j = 1; j <= A; j++) {
        let maxScore = Math.max(dp[i - 1][j], dp[i][j - 1]);
        const s = sim[i - 1][j - 1];
        if (s >= 0.25) {
          maxScore = Math.max(maxScore, dp[i - 1][j - 1] + s);
        }
        dp[i][j] = maxScore;
      }
    }

    // Backtrack to find aligned operations in strict order
    let i = R;
    let j = A;
    const steps: Array<
      | { type: 'match'; rIdx: number; aIdx: number }
      | { type: 'add'; aIdx: number }
      | { type: 'remove'; rIdx: number }
    > = [];

    while (i > 0 || j > 0) {
      if (
        i > 0 &&
        j > 0 &&
        sim[i - 1][j - 1] >= 0.25 &&
        Math.abs(dp[i][j] - (dp[i - 1][j - 1] + sim[i - 1][j - 1])) < 1e-6
      ) {
        steps.push({ type: 'match', rIdx: i - 1, aIdx: j - 1 });
        i--;
        j--;
      } else if (j > 0 && Math.abs(dp[i][j] - dp[i][j - 1]) < 1e-6) {
        steps.push({ type: 'add', aIdx: j - 1 });
        j--;
      } else {
        steps.push({ type: 'remove', rIdx: i - 1 });
        i--;
      }
    }
    steps.reverse();

    for (const step of steps) {
      if (step.type === 'match') {
        const removed = pendingRemovedLines[step.rIdx];
        const added = pendingAddedLines[step.aIdx];
        metrics.modifications++;

        if (granularity !== 'line') {
          const intra = computeIntraLineDiff(
            removed.content,
            added.content,
            granularity === 'char' ? 'char' : 'word'
          );
          removed.spans = intra.oldSpans;
          added.spans = intra.newSpans;
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
          right: {
            lineNumber: added.newLineNumber,
            content: added.content,
            type: 'added',
            spans: added.spans,
            isPlaceholder: false,
          },
        });
      } else if (step.type === 'remove') {
        const removed = pendingRemovedLines[step.rIdx];
        split.push({
          id: `split-row-${lineCounter++}`,
          left: {
            lineNumber: removed.oldLineNumber,
            content: removed.content,
            type: 'removed',
            spans: removed.spans,
            isPlaceholder: false,
          },
          right: {
            lineNumber: null,
            content: null,
            type: 'empty',
            isPlaceholder: true,
          },
        });
      } else {
        const added = pendingAddedLines[step.aIdx];
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
        // Use true content from modifiedText
        const content = modLines[newLn - 1] ?? line;
        const diffLine: DiffLine = {
          id: `line-${lineCounter++}`,
          oldLineNumber: null,
          newLineNumber: newLn,
          type: 'added',
          content,
        };
        unified.push(diffLine);
        pendingAddedLines.push(diffLine);
        newLn++;
      } else if (change.removed) {
        metrics.deletions++;
        // Use true content from originalText
        const content = origLines[oldLn - 1] ?? line;
        const diffLine: DiffLine = {
          id: `line-${lineCounter++}`,
          oldLineNumber: oldLn,
          newLineNumber: null,
          type: 'removed',
          content,
        };
        unified.push(diffLine);
        pendingRemovedLines.push(diffLine);
        oldLn++;
      } else {
        metrics.unchanged++;
        processPendingSplitLines();
        const leftContent = origLines[oldLn - 1] ?? line;
        const rightContent = modLines[newLn - 1] ?? line;
        const diffLine: DiffLine = {
          id: `line-${lineCounter++}`,
          oldLineNumber: oldLn,
          newLineNumber: newLn,
          type: 'unchanged',
          content: rightContent,
        };
        unified.push(diffLine);
        split.push({
          id: `split-row-${lineCounter++}`,
          left: {
            lineNumber: oldLn,
            content: leftContent,
            type: 'unchanged',
            isPlaceholder: false,
          },
          right: {
            lineNumber: newLn,
            content: rightContent,
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

  // Standard Git unified patch with sanitized filenames
  const cleanOrig = cleanFilename(originalFilename) || 'original';
  const cleanMod = cleanFilename(modifiedFilename) || 'modified';

  let patch = '';
  if (metrics.additions > 0 || metrics.deletions > 0) {
    patch = createTwoFilesPatch(
      `a/${cleanOrig}`,
      `b/${cleanMod}`,
      originalText,
      modifiedText,
      cleanOrig,
      cleanMod
    );
  }

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
