import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Inputs } from './components/Inputs';
import { DiffOutput } from './components/DiffOutput';
import { computeDiff, type DiffResult } from './utils/diff';

const SAMPLE_ORIGINAL = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

// Additional helper
function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}
`;

const SAMPLE_MODIFIED = `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Additional helper
function formatCurrency(amount) {
  return \`$\${amount.toFixed(2)}\`;
}

function getDiscount(total, code) {
  if (code === 'SAVE20') return total * 0.8;
  return total;
}
`;

function App() {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  
  const [debouncedOriginal, setDebouncedOriginal] = useState('');
  const [debouncedModified, setDebouncedModified] = useState('');

  // Debounce input changes to prevent UI freezing on large diffs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOriginal(originalText);
      setDebouncedModified(modifiedText);
    }, 200);
    return () => clearTimeout(timer);
  }, [originalText, modifiedText]);

  const diffResult: DiffResult = useMemo(() => {
    return computeDiff(debouncedOriginal, debouncedModified, ignoreWhitespace);
  }, [debouncedOriginal, debouncedModified, ignoreWhitespace]);

  const handleSwap = () => {
    setOriginalText(modifiedText);
    setModifiedText(originalText);
  };

  const handleClear = () => {
    setOriginalText('');
    setModifiedText('');
  };

  const handleLoadSample = () => {
    setOriginalText(SAMPLE_ORIGINAL);
    setModifiedText(SAMPLE_MODIFIED);
  };

  const handleCopyDiff = () => {
    const patchLines = diffResult.unified.map(line => {
      const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
      return `${prefix}${line.content}`;
    });
    const patch = patchLines.join('\n');
    navigator.clipboard.writeText(patch)
      .then(() => alert('Diff copied to clipboard!'))
      .catch(err => console.error('Failed to copy diff:', err));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
      <Header metrics={diffResult.metrics} />
      
      <Toolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        ignoreWhitespace={ignoreWhitespace}
        setIgnoreWhitespace={setIgnoreWhitespace}
        onSwap={handleSwap}
        onClear={handleClear}
        onLoadSample={handleLoadSample}
        onCopyDiff={handleCopyDiff}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Inputs
          originalText={originalText}
          setOriginalText={setOriginalText}
          modifiedText={modifiedText}
          setModifiedText={setModifiedText}
        />
        
        <DiffOutput diff={diffResult} viewMode={viewMode} />
      </div>
    </div>
  );
}

export default App;
