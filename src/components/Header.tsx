import { type DiffMetrics } from '../utils/diff';

interface HeaderProps {
  metrics: DiffMetrics;
}

export function Header({ metrics }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-border shadow-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-foreground">Git Diff Calculator</h1>
      </div>
      <div className="flex items-center gap-4 text-sm font-medium">
        <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md">
          +{metrics.additions} additions
        </span>
        <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md">
          -{metrics.deletions} deletions
        </span>
        <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
          {metrics.unchanged} unchanged
        </span>
      </div>
    </header>
  );
}
