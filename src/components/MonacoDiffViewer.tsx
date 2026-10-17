import { useRef, useEffect } from 'react';
import { DiffEditor, type DiffOnMount, type Monaco } from '@monaco-editor/react';
import { Spin } from 'antd';

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
  navRef?: React.MutableRefObject<{
    nextDiff: () => void;
    prevDiff: () => void;
  } | null>;
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
  const diffEditorRef = useRef<any>(null);

  const handleBeforeMount = (monaco: Monaco) => {
    // Intercept model creation so every model has guarded setValue from the start
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origCreateModel = monaco.editor.createModel.bind(monaco.editor) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    monaco.editor.createModel = function (...args: any[]) {
      const model = origCreateModel(...args);
      patchModelSetValue(model);
      return model;
    };
  };

  const handleEditorMount: DiffOnMount = (editor) => {
    diffEditorRef.current = editor;

    // Two-way data binding when typing inside Monaco
    const originalEditor = editor.getOriginalEditor();
    const modifiedEditor = editor.getModifiedEditor();

    // Patch initial models
    patchModelSetValue(originalEditor.getModel());
    patchModelSetValue(modifiedEditor.getModel());

    // Patch any newly assigned models on model change
    originalEditor.onDidChangeModel(() => {
      patchModelSetValue(originalEditor.getModel());
    });
    modifiedEditor.onDidChangeModel(() => {
      patchModelSetValue(modifiedEditor.getModel());
    });

    originalEditor.onDidChangeModelContent(() => {
      const val = originalEditor.getValue();
      if (onOriginalChange) {
        onOriginalChange(val);
      }
    });

    modifiedEditor.onDidChangeModelContent(() => {
      const val = modifiedEditor.getValue();
      if (onModifiedChange) {
        onModifiedChange(val);
      }
    });
  };

  // Modern Monaco IDiffEditor goToDiff navigation for F7 / Next / Prev Diff
  useEffect(() => {
    if (navRef) {
      navRef.current = {
        nextDiff: () => {
          if (diffEditorRef.current && typeof diffEditorRef.current.goToDiff === 'function') {
            diffEditorRef.current.goToDiff('next');
          }
        },
        prevDiff: () => {
          if (diffEditorRef.current && typeof diffEditorRef.current.goToDiff === 'function') {
            diffEditorRef.current.goToDiff('previous');
          }
        },
      };
    }
  }, [navRef]);

  // Clean unmount to prevent "TextModel got disposed before DiffEditorWidget model got reset"
  useEffect(() => {
    return () => {
      if (diffEditorRef.current) {
        try {
          diffEditorRef.current.setModel(null);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
      <DiffEditor
        original={originalText}
        modified={modifiedText}
        language={language}
        theme={isDarkMode ? 'vs-dark' : 'light'}
        loading={
          <div className="flex items-center justify-center h-full w-full">
            <Spin description="Loading VS Code Diff Editor..." size="large" />
          </div>
        }
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        options={{
          renderSideBySide: viewMode === 'split',
          originalEditable: true,
          readOnly: false,
          ignoreTrimWhitespace: ignoreWhitespace,
          wordWrap: wordWrap ? 'on' : 'off',
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontSize: 13,
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          lineNumbers: 'on',
          diffAlgorithm: 'advanced',
          renderIndicators: true,
          useInlineViewWhenSpaceIsLimited: false,
          folding: true,
          glyphMargin: true,
        }}
      />
    </div>
  );
}
