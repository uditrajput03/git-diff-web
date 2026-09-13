import { type DiffResult, type DiffType } from '../utils/diff';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DiffOutputProps {
  diff: DiffResult;
  viewMode: 'split' | 'unified';
}

function getLineColor(type: DiffType) {
  switch (type) {
    case 'added': return 'bg-green-100/50 text-green-900';
    case 'removed': return 'bg-red-100/50 text-red-900';
    case 'unchanged': return 'text-gray-800';
  }
}

function getNumberColor(type: DiffType) {
  switch (type) {
    case 'added': return 'bg-green-100/80 text-green-600 border-r-green-200';
    case 'removed': return 'bg-red-100/80 text-red-600 border-r-red-200';
    case 'unchanged': return 'bg-gray-50 text-gray-400 border-r-border';
  }
}

function getPrefix(type: DiffType) {
  switch (type) {
    case 'added': return '+';
    case 'removed': return '-';
    case 'unchanged': return ' ';
  }
}

export function DiffOutput({ diff, viewMode }: DiffOutputProps) {
  if (viewMode === 'unified') {
    return (
      <div className="flex-1 overflow-auto bg-white m-4 border border-border rounded-md shadow-sm font-mono text-sm leading-6">
        <table className="w-full border-collapse whitespace-pre">
          <tbody>
            {diff.unified.map((line, i) => (
              <tr key={i} className={cn("group", getLineColor(line.type))}>
                <td className={cn(
                  "w-12 min-w-[3rem] px-2 text-right select-none border-r",
                  getNumberColor(line.type)
                )}>
                  {line.oldLineNumber}
                </td>
                <td className={cn(
                  "w-12 min-w-[3rem] px-2 text-right select-none border-r",
                  getNumberColor(line.type)
                )}>
                  {line.newLineNumber}
                </td>
                <td className="px-3 w-4 select-none opacity-70">
                  {getPrefix(line.type)}
                </td>
                <td className="pr-4 py-0.5 break-all break-words">
                  {line.content || ' '}
                </td>
              </tr>
            ))}
            {diff.unified.length === 0 && (
              <tr>
                <td className="p-8 text-center text-muted-foreground" colSpan={4}>
                  No differences found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Split View
  return (
    <div className="flex-1 overflow-auto bg-white m-4 border border-border rounded-md shadow-sm font-mono text-sm leading-6 flex">
      <div className="w-1/2 overflow-x-auto border-r border-border">
        <table className="w-full border-collapse whitespace-pre">
          <tbody>
            {diff.split.map((row, i) => (
              <tr key={i} className={cn(row.left ? getLineColor(row.left.type) : 'bg-gray-50')}>
                <td className={cn(
                  "w-12 min-w-[3rem] px-2 text-right select-none border-r",
                  row.left ? getNumberColor(row.left.type) : 'bg-gray-50 border-r-border'
                )}>
                  {row.left?.lineNumber}
                </td>
                <td className="px-2 w-4 select-none opacity-70">
                  {row.left ? getPrefix(row.left.type) : ' '}
                </td>
                <td className="pr-4 py-0.5 break-all break-words">
                  {row.left?.content || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="w-1/2 overflow-x-auto">
        <table className="w-full border-collapse whitespace-pre">
          <tbody>
            {diff.split.map((row, i) => (
              <tr key={i} className={cn(row.right ? getLineColor(row.right.type) : 'bg-gray-50')}>
                <td className={cn(
                  "w-12 min-w-[3rem] px-2 text-right select-none border-r",
                  row.right ? getNumberColor(row.right.type) : 'bg-gray-50 border-r-border'
                )}>
                  {row.right?.lineNumber}
                </td>
                <td className="px-2 w-4 select-none opacity-70">
                  {row.right ? getPrefix(row.right.type) : ' '}
                </td>
                <td className="pr-4 py-0.5 break-all break-words">
                  {row.right?.content || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
