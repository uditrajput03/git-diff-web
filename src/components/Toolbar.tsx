import { Columns, List, ArrowLeftRight, Trash2, FileText, Copy, AlignLeft } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ToolbarProps {
  viewMode: 'split' | 'unified';
  setViewMode: (mode: 'split' | 'unified') => void;
  ignoreWhitespace: boolean;
  setIgnoreWhitespace: (ignore: boolean) => void;
  onSwap: () => void;
  onClear: () => void;
  onLoadSample: () => void;
  onCopyDiff: () => void;
}

export function Toolbar({
  viewMode,
  setViewMode,
  ignoreWhitespace,
  setIgnoreWhitespace,
  onSwap,
  onClear,
  onLoadSample,
  onCopyDiff,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-gray-50 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="flex bg-white rounded-md border border-border overflow-hidden shadow-sm">
          <button
            onClick={() => setViewMode('split')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === 'split' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
            )}
          >
            <Columns className="w-4 h-4" />
            Split
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors",
              viewMode === 'unified' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-gray-100"
            )}
          >
            <List className="w-4 h-4" />
            Unified
          </button>
        </div>

        <button
          onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border shadow-sm transition-colors",
            ignoreWhitespace ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground border-border hover:bg-gray-50 hover:text-foreground"
          )}
          title="Ignore trailing and leading whitespaces"
        >
          <AlignLeft className="w-4 h-4" />
          Ignore Whitespace
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onLoadSample}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white text-muted-foreground border border-border rounded-md shadow-sm hover:bg-gray-50 hover:text-foreground transition-colors"
        >
          <FileText className="w-4 h-4" />
          Load Sample
        </button>
        <button
          onClick={onSwap}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white text-muted-foreground border border-border rounded-md shadow-sm hover:bg-gray-50 hover:text-foreground transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Swap
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white text-destructive border border-border rounded-md shadow-sm hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          onClick={onCopyDiff}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy Patch
        </button>
      </div>
    </div>
  );
}
