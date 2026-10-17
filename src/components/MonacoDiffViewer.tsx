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
    // If model already contains the new value (e.g. user just typed it),
    // do NOT call setValue because that resets cursor position to (1, 1),
    // which causes subsequent keystrokes to be typed in reverse order.
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

  const handleEditorDidMount: DiffOnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;

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
        ignoreTrimWhitespace: ignoreWhitespace,
        wordWrap: wordWrap ? 'on' : 'off',
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
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
