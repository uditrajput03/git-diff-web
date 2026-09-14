import { useRef, useEffect } from 'react';
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navInstanceRef = useRef<any>(null);

  const handleEditorMount: DiffOnMount = (editor, monaco) => {
    diffEditorRef.current = editor;

    // Create diff navigator for Next/Previous hunk jumping
    try {
      navInstanceRef.current = monaco.editor.createDiffNavigator(editor, {
        followsCaret: true,
        ignoreCharChanges: false,
      });
    } catch {
      // Ignore if navigator is not available
    }

    // Two-way data binding when typing inside Monaco
    const originalEditor = editor.getOriginalEditor();
    const modifiedEditor = editor.getModifiedEditor();

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

  // Expose next / previous change jumping
  useEffect(() => {
    if (navRef) {
      navRef.current = {
        nextDiff: () => {
          if (navInstanceRef.current && navInstanceRef.current.canNavigate()) {
            navInstanceRef.current.next();
          }
        },
        prevDiff: () => {
          if (navInstanceRef.current && navInstanceRef.current.canNavigate()) {
            navInstanceRef.current.previous();
          }
        },
      };
    }
  }, [navRef]);

  return (
    <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
      <DiffEditor
        original={originalText}
        modified={modifiedText}
        language={language}
        theme={isDarkMode ? 'vs-dark' : 'light'}
        loading={
          <div className="flex items-center justify-center h-full w-full">
            <Spin tip="Loading VS Code Diff Editor..." size="large" />
          </div>
        }
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
