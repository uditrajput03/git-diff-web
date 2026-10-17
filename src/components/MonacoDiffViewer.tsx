import { useRef, useEffect } from 'react';
import { DiffEditor, type DiffOnMount, type Monaco } from '@monaco-editor/react';
import { Spin } from 'antd';

export interface MonacoDiffNavHandle {
  nextDiff: () => void;
  prevDiff: () => void;
}

interface MonacoDiffViewerProps {
  originalText: string;
  modifiedText: string;
  onOriginalChange?: (text: string) => void;
  onModifiedChange?: (text: string) => void;
  language: string;
  viewMode: 'split' | 'unified';
  ignoreWhitespace: boolean;
  wordWrap: boolean;
  isDarkMode: boolean;
  navRef?: React.MutableRefObject<MonacoDiffNavHandle | null>;
}

// Helper to patch model.setValue to prevent cursor jumping / reverse-order typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patchModelSetValue(model: any) {
  if (!model || model.__setValuePatched) return;
  const origSetValue = model.setValue.bind(model);
  model.setValue = function (newVal: string) {
    if (this.getValue() === newVal) {
      return;
    }
    origSetValue(newVal);
  };
  model.__setValuePatched = true;
}

export function MonacoDiffViewer({
  originalText,
  modifiedText,
  onOriginalChange,
  onModifiedChange,
  language,
  viewMode,
  ignoreWhitespace,
  wordWrap,
  isDarkMode,
  navRef,
}: MonacoDiffViewerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigatorRef = useRef<any>(null);

  // Equalize original and modified panes to 50-50% width each
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equalizeSplitRatio = (editorInstance: any) => {
    if (!editorInstance) return;
    try {
      const container = editorInstance.getContainerDomNode?.();
      if (!container) return;
      const totalWidth = container.clientWidth;
      if (totalWidth <= 0) return;

      const gutterWidth = container.querySelector('.gutter')?.clientWidth || 35;
      const overviewRuler = container.querySelector('.diffOverview');
      const overviewWidth = overviewRuler ? overviewRuler.clientWidth : 0;
      const splitWidth = totalWidth - overviewWidth;
      if (splitWidth <= 0) return;

      const targetSashLeft = Math.round((splitWidth + gutterWidth) / 2);
      const ratio = (targetSashLeft + 0.0001) / splitWidth;

      editorInstance.updateOptions({
        splitViewDefaultRatio: ratio,
      });
      editorInstance._sashLayout?.resetSash();

      // DiffEditor.updateOptions re-enables glyphMargin on original editor; turn it off
      editorInstance.getOriginalEditor?.().updateOptions({ glyphMargin: false });
    } catch {
      // Ignore if editor is not yet mounted
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyInnerEditorOptions = (editorInstance: any, wrap: boolean, split: boolean) => {
    if (!editorInstance) return;
    try {
      const origEditor = editorInstance.getOriginalEditor?.();
      const modEditor = editorInstance.getModifiedEditor?.();
      const wrapVal = wrap ? 'on' : 'off';
      const overrideVal = wrap ? 'inherit' : 'off';

      // 1. Update DiffEditor level options
      editorInstance.updateOptions({
        renderSideBySide: split,
        useInlineViewWhenSpaceIsLimited: false,
        diffWordWrap: wrapVal,
        glyphMargin: false,
      });

      // 2. Equalize split if in side-by-side mode
      if (split) {
        equalizeSplitRatio(editorInstance);
      }

      // 3. Apply options to both inner editors (must run after diff editor updates)
      if (origEditor) {
        origEditor.updateOptions({
          glyphMargin: false,
          wordWrap: wrapVal,
          wordWrapOverride2: overrideVal,
        });
      }

      if (modEditor) {
        modEditor.updateOptions({
          glyphMargin: false,
          wordWrap: wrapVal,
          wordWrapOverride2: overrideVal,
        });
      }
    } catch {
      // Ignore if editor is not yet ready
    }
  };

  const handleEditorDidMount: DiffOnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;

    // Apply strict symmetry, word-wrap alignment, and 50-50 equal split
    const sync = () => {
      applyInnerEditorOptions(editor, wordWrap, viewMode === 'split');
    };

    sync();
    requestAnimationFrame(sync);
    setTimeout(sync, 100);

    // Observe container resizes to maintain 50-50 equal width dynamically
    try {
      const container = editor.getContainerDomNode();
      if (container && typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          if (viewMode === 'split') {
            equalizeSplitRatio(editor);
          }
        });
        resizeObserver.observe(container);
      }
    } catch {
      // Ignore if ResizeObserver is unavailable
    }

    // Create diff navigator for smooth next/prev diff navigation
    try {
      navigatorRef.current = monaco.editor.createDiffNavigator(editor, {
        followsCaret: true,
        ignoreCharChanges: false,
      });
    } catch {
      // Ignore if navigator cannot be created
    }

    // Patch setValue on both original and modified models to prevent reverse typing
    const originalModel = editor.getOriginalEditor().getModel();
    const modifiedModel = editor.getModifiedEditor().getModel();
    patchModelSetValue(originalModel);
    patchModelSetValue(modifiedModel);

    // Listen to changes in the modified editor
    if (onModifiedChange && modifiedModel) {
      modifiedModel.onDidChangeContent(() => {
        onModifiedChange(modifiedModel.getValue());
      });
    }

    // Listen to changes in the original editor
    if (onOriginalChange && originalModel) {
      originalModel.onDidChangeContent(() => {
        onOriginalChange(originalModel.getValue());
      });
    }
  };

  // Synchronize options when wordWrap or viewMode changes
  useEffect(() => {
    if (editorRef.current) {
      applyInnerEditorOptions(editorRef.current, wordWrap, viewMode === 'split');
    }
  }, [wordWrap, viewMode]);

  // Expose navigation methods via navRef
  useEffect(() => {
    if (navRef) {
      navRef.current = {
        nextDiff: () => {
          if (navigatorRef.current && navigatorRef.current.next) {
            navigatorRef.current.next();
          }
        },
        prevDiff: () => {
          if (navigatorRef.current && navigatorRef.current.previous) {
            navigatorRef.current.previous();
          }
        },
      };
    }
    return () => {
      if (navRef) {
        navRef.current = null;
      }
    };
  }, [navRef]);

  // Clean up navigator on unmount
  useEffect(() => {
    return () => {
      if (navigatorRef.current && typeof navigatorRef.current.dispose === 'function') {
        try {
          navigatorRef.current.dispose();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return (
    <DiffEditor
      height="100%"
      language={language}
      original={originalText}
      modified={modifiedText}
      onMount={handleEditorDidMount}
      theme={isDarkMode ? 'vs-dark' : 'light'}
      options={{
        readOnly: false,
        originalEditable: true,
        renderSideBySide: viewMode === 'split',
        useInlineViewWhenSpaceIsLimited: false,
        ignoreTrimWhitespace: ignoreWhitespace,
        wordWrap: wordWrap ? 'on' : 'off',
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        glyphMargin: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        renderOverviewRuler: true,
        diffWordWrap: wordWrap ? 'on' : 'off',
        hideUnchangedRegions: {
          enabled: false,
        },
      }}
      loading={
        <div className="flex h-full w-full items-center justify-center">
          <Spin size="large" description="Loading Monaco Editor..." />
        </div>
      }
    />
  );
}
