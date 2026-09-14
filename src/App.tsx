import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ConfigProvider, theme, message, App as AntdApp } from 'antd';
import { Header } from './components/Header';
import { Toolbar, type DiffEngine } from './components/Toolbar';
import { Inputs } from './components/Inputs';
import { DiffOutput } from './components/DiffOutput';
import { MonacoDiffViewer } from './components/MonacoDiffViewer';
import { HelpModal } from './components/HelpModal';
import {
  computeDiff,
  downloadFile,
  detectLanguage,
  type DiffResult,
  type Granularity,
} from './utils/diff';
import { DIFF_SAMPLES, type DiffSample } from './utils/samples';

const getSaved = (key: string, defaultVal: string) => {
  try {
    return localStorage.getItem(key) ?? defaultVal;
  } catch {
    return defaultVal;
  }
};

interface MainAppProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
}

function MainApp({ isDarkMode, setIsDarkMode }: MainAppProps) {
  const [originalText, setOriginalText] = useState<string>(() =>
    getSaved('gdw_original', DIFF_SAMPLES[0].original)
  );
  const [modifiedText, setModifiedText] = useState<string>(() =>
    getSaved('gdw_modified', DIFF_SAMPLES[0].modified)
  );
  const [originalFilename, setOriginalFilename] = useState<string>(() =>
    getSaved('gdw_original_fn', DIFF_SAMPLES[0].originalFilename)
  );
  const [modifiedFilename, setModifiedFilename] = useState<string>(() =>
    getSaved('gdw_modified_fn', DIFF_SAMPLES[0].modifiedFilename)
  );

  const [diffEngine, setDiffEngine] = useState<DiffEngine>(() =>
    (getSaved('gdw_diff_engine', 'monaco') as DiffEngine)
  );
  const [language, setLanguage] = useState<string>(() =>
    getSaved('gdw_language', DIFF_SAMPLES[0].language)
  );

  const [viewMode, setViewMode] = useState<'split' | 'unified'>(() =>
    (getSaved('gdw_view_mode', 'split') as 'split' | 'unified')
  );
  const [granularity, setGranularity] = useState<Granularity>(() =>
    (getSaved('gdw_granularity', 'word') as Granularity)
  );

  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(() =>
    getSaved('gdw_ignore_ws', 'false') === 'true'
  );
  const [ignoreCase, setIgnoreCase] = useState<boolean>(() =>
    getSaved('gdw_ignore_case', 'false') === 'true'
  );
  const [wordWrap, setWordWrap] = useState<boolean>(() =>
    getSaved('gdw_word_wrap', 'false') === 'true'
  );
  const [foldUnchanged, setFoldUnchanged] = useState<boolean>(() =>
    getSaved('gdw_fold_unchanged', 'false') === 'true'
  );
  const [showInputs, setShowInputs] = useState<boolean>(() =>
    getSaved('gdw_show_inputs', 'false') === 'true'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  // Reference for Monaco diff hunk navigation
  const monacoNavRef = useRef<{
    nextDiff: () => void;
    prevDiff: () => void;
  } | null>(null);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('gdw_original', originalText);
      localStorage.setItem('gdw_modified', modifiedText);
      localStorage.setItem('gdw_original_fn', originalFilename);
      localStorage.setItem('gdw_modified_fn', modifiedFilename);
      localStorage.setItem('gdw_diff_engine', diffEngine);
      localStorage.setItem('gdw_language', language);
      localStorage.setItem('gdw_view_mode', viewMode);
      localStorage.setItem('gdw_granularity', granularity);
      localStorage.setItem('gdw_ignore_ws', String(ignoreWhitespace));
      localStorage.setItem('gdw_ignore_case', String(ignoreCase));
      localStorage.setItem('gdw_word_wrap', String(wordWrap));
      localStorage.setItem('gdw_fold_unchanged', String(foldUnchanged));
      localStorage.setItem('gdw_show_inputs', String(showInputs));
    } catch {
      // Ignore quota errors
    }
  }, [
    originalText,
    modifiedText,
    originalFilename,
    modifiedFilename,
    diffEngine,
    language,
    viewMode,
    granularity,
    ignoreWhitespace,
    ignoreCase,
    wordWrap,
    foldUnchanged,
    showInputs,
  ]);

  // Debounced diff computation
  const [debouncedOriginal, setDebouncedOriginal] = useState(originalText);
  const [debouncedModified, setDebouncedModified] = useState(modifiedText);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOriginal(originalText);
      setDebouncedModified(modifiedText);
    }, 150);
    return () => clearTimeout(timer);
  }, [originalText, modifiedText]);

  const diffResult: DiffResult = useMemo(() => {
    return computeDiff(debouncedOriginal, debouncedModified, {
      ignoreWhitespace,
      ignoreCase,
      granularity,
    });
  }, [debouncedOriginal, debouncedModified, ignoreWhitespace, ignoreCase, granularity]);

  // Search match count
  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.trim().toLowerCase();
    let count = 0;
    for (const line of diffResult.unified) {
      const lower = line.content.toLowerCase();
      let pos = 0;
      while ((pos = lower.indexOf(q, pos)) !== -1) {
        count++;
        pos += q.length;
      }
    }
    return count;
  }, [searchQuery, diffResult.unified]);

  const handleNextMatch = () => {
    if (searchMatchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % searchMatchCount);
  };

  const handlePrevMatch = () => {
    if (searchMatchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + searchMatchCount) % searchMatchCount);
  };

  const handleNextDiffHunk = () => {
    if (diffEngine === 'monaco' && monacoNavRef.current) {
      monacoNavRef.current.nextDiff();
    } else {
      handleNextMatch();
    }
  };

  const handlePrevDiffHunk = () => {
    if (diffEngine === 'monaco' && monacoNavRef.current) {
      monacoNavRef.current.prevDiff();
    } else {
      handlePrevMatch();
    }
  };

  const handleSwap = useCallback(() => {
    setOriginalText(modifiedText);
    setModifiedText(originalText);
    setOriginalFilename(modifiedFilename);
    setModifiedFilename(originalFilename);
    message.success('Swapped Original and Modified inputs');
  }, [originalText, modifiedText, originalFilename, modifiedFilename]);

  const handleClear = useCallback(() => {
    setOriginalText('');
    setModifiedText('');
    setOriginalFilename('original.txt');
    setModifiedFilename('modified.txt');
    message.info('Cleared both inputs');
  }, []);

  const handleSelectSample = useCallback((sample: DiffSample) => {
    setOriginalText(sample.original);
    setModifiedText(sample.modified);
    setOriginalFilename(sample.originalFilename);
    setModifiedFilename(sample.modifiedFilename);
    setLanguage(sample.language);
    message.success(`Loaded sample: ${sample.name}`);
  }, []);

  const handleOriginalFilenameChange = (name: string) => {
    setOriginalFilename(name);
    const detected = detectLanguage(name);
    if (detected !== 'plaintext') {
      setLanguage(detected);
    }
  };

  const handleModifiedFilenameChange = (name: string) => {
    setModifiedFilename(name);
    const detected = detectLanguage(name);
    if (detected !== 'plaintext') {
      setLanguage(detected);
    }
  };

  const handleCopyPatch = useCallback(() => {
    if (!diffResult.patch) {
      message.info('No diff to copy');
      return;
    }
    navigator.clipboard
      .writeText(diffResult.patch)
      .then(() => message.success('Git Unified Patch copied to clipboard!'))
      .catch(() => message.error('Failed to copy patch to clipboard'));
  }, [diffResult.patch]);

  const handleExportPatch = useCallback(() => {
    if (!diffResult.patch) {
      message.info('No diff to export');
      return;
    }
    downloadFile(diffResult.patch, 'changes.patch', 'text/x-diff');
    message.success('Exported changes.patch');
  }, [diffResult.patch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const searchInput = document.querySelector(
          'input[placeholder^="Search in diff"]'
        ) as HTMLInputElement;
        if (searchInput && document.activeElement !== searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSwap();
      }
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'split' ? 'unified' : 'split'));
      }
      if (e.key === 'F7') {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrevDiffHunk();
        } else {
          handleNextDiffHunk();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwap]);

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden ${
        isDarkMode ? 'dark bg-[#0b0e14] text-[#e6edf3]' : 'bg-gray-100 text-gray-900'
      }`}
    >
      <Header
        metrics={diffResult.metrics}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <Toolbar
        diffEngine={diffEngine}
        setDiffEngine={setDiffEngine}
        language={language}
        setLanguage={setLanguage}
        viewMode={viewMode}
        setViewMode={setViewMode}
        granularity={granularity}
        setGranularity={setGranularity}
        ignoreWhitespace={ignoreWhitespace}
        setIgnoreWhitespace={setIgnoreWhitespace}
        ignoreCase={ignoreCase}
        setIgnoreCase={setIgnoreCase}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        foldUnchanged={foldUnchanged}
        setFoldUnchanged={setFoldUnchanged}
        showInputs={showInputs}
        setShowInputs={setShowInputs}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchMatchCount={searchMatchCount}
        currentMatchIndex={currentMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        onNextDiffHunk={handleNextDiffHunk}
        onPrevDiffHunk={handlePrevDiffHunk}
        onSelectSample={handleSelectSample}
        onSwap={handleSwap}
        onClear={handleClear}
        onCopyPatch={handleCopyPatch}
        onExportPatch={handleExportPatch}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <Inputs
          originalText={originalText}
          setOriginalText={setOriginalText}
          originalFilename={originalFilename}
          setOriginalFilename={handleOriginalFilenameChange}
          modifiedText={modifiedText}
          setModifiedText={setModifiedText}
          modifiedFilename={modifiedFilename}
          setModifiedFilename={handleModifiedFilenameChange}
          showInputs={showInputs}
        />

        {diffEngine === 'monaco' ? (
          <div className="flex-1 w-full h-full min-h-0 p-3 pt-1">
            <div
              className="w-full h-full rounded-lg overflow-hidden border shadow-sm"
              style={{ borderColor: isDarkMode ? '#30363d' : '#d0d7de' }}
            >
              <MonacoDiffViewer
                originalText={originalText}
                modifiedText={modifiedText}
                onOriginalChange={setOriginalText}
                onModifiedChange={setModifiedText}
                language={language}
                viewMode={viewMode}
                ignoreWhitespace={ignoreWhitespace}
                wordWrap={wordWrap}
                isDarkMode={isDarkMode}
                navRef={monacoNavRef}
              />
            </div>
          </div>
        ) : (
          <DiffOutput
            diff={diffResult}
            viewMode={viewMode}
            wordWrap={wordWrap}
            foldUnchanged={foldUnchanged}
            searchQuery={searchQuery}
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gdw_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gdw_dark_mode', String(isDarkMode));
    } catch {
      // Ignore quota errors
    }
  }, [isDarkMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <AntdApp>
        <MainApp isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      </AntdApp>
    </ConfigProvider>
  );
}
