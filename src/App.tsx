import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { Header } from './components/Header';
import { Toolbar, type DiffEngine } from './components/Toolbar';
import { Inputs } from './components/Inputs';
import { DiffOutput, type DiffOutputNavHandle } from './components/DiffOutput';
import { MonacoDiffViewer, type MonacoDiffNavHandle } from './components/MonacoDiffViewer';
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
  const { message } = AntdApp.useApp();

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
    (getSaved('gdw_diff_engine', 'github') as DiffEngine)
  );
  const [language, setLanguage] = useState<string>(() =>
    getSaved('gdw_language', 'plaintext')
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
    getSaved('gdw_word_wrap', 'true') === 'true'
  );
  const [foldUnchanged, setFoldUnchanged] = useState<boolean>(() =>
    getSaved('gdw_fold_unchanged', 'false') === 'true'
  );
  const [showInputs, setShowInputs] = useState<boolean>(() =>
    getSaved('gdw_show_inputs', 'true') === 'true'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [renderedMatchCount, setRenderedMatchCount] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  // References for diff hunk navigation
  const monacoNavRef = useRef<MonacoDiffNavHandle | null>(null);
  const githubNavRef = useRef<DiffOutputNavHandle | null>(null);

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
    }, 120);
    return () => clearTimeout(timer);
  }, [originalText, modifiedText]);

  const diffResult: DiffResult = useMemo(() => {
    return computeDiff(debouncedOriginal, debouncedModified, {
      ignoreWhitespace,
      ignoreCase,
      granularity,
      originalFilename,
      modifiedFilename,
    });
  }, [
    debouncedOriginal,
    debouncedModified,
    ignoreWhitespace,
    ignoreCase,
    granularity,
    originalFilename,
    modifiedFilename,
  ]);

  // Search match count calculation
  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const query = searchQuery.toLowerCase();
    let count = 0;

    const countInStr = (str: string) => {
      let pos = 0;
      const lower = str.toLowerCase();
      while ((pos = lower.indexOf(query, pos)) !== -1) {
        count++;
        pos += query.length;
      }
    };

    diffResult.unified.forEach((l) => countInStr(l.content));
    return count;
  }, [searchQuery, diffResult.unified]);

  const effectiveMatchCount =
    diffEngine === 'github' && renderedMatchCount > 0
      ? renderedMatchCount
      : searchMatchCount;

  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  const handleNextMatch = useCallback(() => {
    if (effectiveMatchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % effectiveMatchCount);
  }, [effectiveMatchCount]);

  const handlePrevMatch = useCallback(() => {
    if (effectiveMatchCount === 0) return;
    setCurrentMatchIndex(
      (prev) => (prev - 1 + effectiveMatchCount) % effectiveMatchCount
    );
  }, [effectiveMatchCount]);

  // Jump between diff hunks
  const handleNextDiffHunk = useCallback(() => {
    if (diffEngine === 'monaco') {
      monacoNavRef.current?.nextDiff();
    } else {
      githubNavRef.current?.nextDiff();
    }
  }, [diffEngine]);

  const handlePrevDiffHunk = useCallback(() => {
    if (diffEngine === 'monaco') {
      monacoNavRef.current?.prevDiff();
    } else {
      githubNavRef.current?.prevDiff();
    }
  }, [diffEngine]);

  // Sample Loader
  const handleSelectSample = (sample: DiffSample) => {
    setOriginalText(sample.original);
    setModifiedText(sample.modified);
    setOriginalFilename(sample.originalFilename);
    setModifiedFilename(sample.modifiedFilename);
    setLanguage(sample.language || detectLanguage(sample.originalFilename));
    message.success(`Loaded sample: "${sample.name}"`);
  };

  // Swap Left and Right
  const handleSwap = () => {
    setOriginalText(modifiedText);
    setModifiedText(originalText);
    setOriginalFilename(modifiedFilename);
    setModifiedFilename(originalFilename);
    message.info('Swapped Original and Modified contents');
  };

  // Clear inputs
  const handleClear = () => {
    setOriginalText('');
    setModifiedText('');
    message.info('Cleared all editors');
  };

  // Copy patch
  const handleCopyPatch = () => {
    if (!diffResult.patch || (diffResult.metrics.additions === 0 && diffResult.metrics.deletions === 0)) {
      message.warning('No difference detected to generate patch');
      return;
    }
    navigator.clipboard
      .writeText(diffResult.patch)
      .then(() => message.success('Copied Git unified patch to clipboard!'))
      .catch(() => message.error('Failed to copy patch'));
  };

  // Export .patch file
  const handleExportPatch = useCallback(() => {
    if (!diffResult.patch || (diffResult.metrics.additions === 0 && diffResult.metrics.deletions === 0)) {
      message.warning('No difference detected to generate patch');
      return;
    }
    const filename = `${modifiedFilename.replace(/[^a-zA-Z0-9_-]/g, '_') || 'changes'}.patch`;
    downloadFile(diffResult.patch, filename);
    message.success(`Downloaded ${filename}`);
  }, [diffResult.patch, diffResult.metrics, modifiedFilename, message]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const searchInput = document.querySelector(
          'input[placeholder^="Search"]'
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
  }, [handleSwap, handlePrevDiffHunk, handleNextDiffHunk]);

  const handleOriginalFilenameChange = (val: string) => {
    setOriginalFilename(val);
    const detected = detectLanguage(val);
    if (detected !== 'plaintext') setLanguage(detected);
  };

  const handleModifiedFilenameChange = (val: string) => {
    setModifiedFilename(val);
    const detected = detectLanguage(val);
    if (detected !== 'plaintext') setLanguage(detected);
  };

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
        searchMatchCount={effectiveMatchCount}
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

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-2">
        {showInputs && (
          <Inputs
            originalText={originalText}
            modifiedText={modifiedText}
            setOriginalText={setOriginalText}
            setModifiedText={setModifiedText}
            originalFilename={originalFilename}
            modifiedFilename={modifiedFilename}
            setOriginalFilename={handleOriginalFilenameChange}
            setModifiedFilename={handleModifiedFilenameChange}
            isDarkMode={isDarkMode}
          />
        )}

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {diffEngine === 'monaco' ? (
            <div className="flex-1 w-full h-full min-h-0 px-4 pb-3">
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
              currentMatchIndex={currentMatchIndex}
              onMatchCountChange={setRenderedMatchCount}
              isDarkMode={isDarkMode}
              navRef={githubNavRef}
              originalFilename={originalFilename}
              modifiedFilename={modifiedFilename}
            />
          )}
        </div>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

export function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gdw_dark_mode');
      if (saved !== null) return saved === 'true';
      return (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
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
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
export default App;
