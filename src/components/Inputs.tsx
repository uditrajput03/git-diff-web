import { Trash2 } from 'lucide-react';

interface InputsProps {
  originalText: string;
  setOriginalText: (text: string) => void;
  modifiedText: string;
  setModifiedText: (text: string) => void;
}

export function Inputs({
  originalText,
  setOriginalText,
  modifiedText,
  setModifiedText,
}: InputsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 flex-shrink-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Original / Before</label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{originalText.split('\n').length} lines</span>
            <button
              onClick={() => setOriginalText('')}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Clear Original"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <textarea
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          className="w-full h-48 p-3 font-mono text-sm bg-white border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Paste original text or code here..."
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Modified / After</label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{modifiedText.split('\n').length} lines</span>
            <button
              onClick={() => setModifiedText('')}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Clear Modified"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <textarea
          value={modifiedText}
          onChange={(e) => setModifiedText(e.target.value)}
          className="w-full h-48 p-3 font-mono text-sm bg-white border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder="Paste modified text or code here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}
