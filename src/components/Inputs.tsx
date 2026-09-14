import React, { useRef } from 'react';
import { Card, Input, Button, Tooltip, Tag, message } from 'antd';
import {
  UploadOutlined,
  CopyOutlined,
  SnippetsOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;

interface InputsProps {
  originalText: string;
  setOriginalText: (text: string) => void;
  originalFilename: string;
  setOriginalFilename: (name: string) => void;
  modifiedText: string;
  setModifiedText: (text: string) => void;
  modifiedFilename: string;
  setModifiedFilename: (name: string) => void;
  showInputs: boolean;
}

export function Inputs({
  originalText,
  setOriginalText,
  originalFilename,
  setOriginalFilename,
  modifiedText,
  setModifiedText,
  modifiedFilename,
  setModifiedFilename,
  showInputs,
}: InputsProps) {
  const originalFileRef = useRef<HTMLInputElement>(null);
  const modifiedFileRef = useRef<HTMLInputElement>(null);

  if (!showInputs) {
    return null;
  }

  const handleFileUpload = (
    file: File,
    setText: (content: string) => void,
    setFilename: (name: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content || '');
      setFilename(file.name);
      message.success(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.onerror = () => {
      message.error(`Failed to read file ${file.name}`);
    };
    reader.readAsText(file);
    return false;
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) {
      message.info(`${label} is empty`);
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => message.success(`Copied ${label} to clipboard!`))
      .catch(() => message.error('Failed to copy to clipboard'));
  };

  const handlePaste = async (setText: (content: string) => void, label: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setText(text);
        message.success(`Pasted into ${label}!`);
      } else {
        message.info('Clipboard is empty');
      }
    } catch {
      message.warning('Clipboard access denied. Please use Ctrl+V / Cmd+V in the editor.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (
    e: React.DragEvent,
    setText: (content: string) => void,
    setFilename: (name: string) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file, setText, setFilename);
    }
  };

  const originalLines = originalText ? originalText.split('\n').length : 0;
  const originalChars = originalText.length;

  const modifiedLines = modifiedText ? modifiedText.split('\n').length : 0;
  const modifiedChars = modifiedText.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 flex-shrink-0">
      {/* Original / Before Editor */}
      <Card
        size="small"
        className="shadow-sm"
        title={
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileTextOutlined style={{ color: '#ff4d4f' }} />
              <span className="font-semibold text-sm">Original (Before)</span>
              <span className="text-xs opacity-60 font-mono">[{originalFilename}]</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tag style={{ margin: 0 }}>{originalLines} lines</Tag>
              <Tag style={{ margin: 0 }}>{originalChars} chars</Tag>
            </div>
          </div>
        }
        extra={
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={originalFileRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, setOriginalText, setOriginalFilename);
              }}
            />
            <Tooltip title="Upload local file (or drag and drop)">
              <Button
                size="small"
                type="text"
                icon={<UploadOutlined />}
                onClick={() => originalFileRef.current?.click()}
              />
            </Tooltip>
            <Tooltip title="Paste from clipboard">
              <Button
                size="small"
                type="text"
                icon={<SnippetsOutlined />}
                onClick={() => handlePaste(setOriginalText, 'Original')}
              />
            </Tooltip>
            <Tooltip title="Copy all original text">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(originalText, 'Original')}
              />
            </Tooltip>
            <Tooltip title="Clear original text">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => setOriginalText('')}
              />
            </Tooltip>
          </div>
        }
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, setOriginalText, setOriginalFilename)}
      >
        <TextArea
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          placeholder="Paste original code/text here, or drag & drop a file..."
          rows={7}
          spellCheck={false}
          className="diff-code-font w-full resize-y font-mono text-xs"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </Card>

      {/* Modified / After Editor */}
      <Card
        size="small"
        className="shadow-sm"
        title={
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileTextOutlined style={{ color: '#52c41a' }} />
              <span className="font-semibold text-sm">Modified (After)</span>
              <span className="text-xs opacity-60 font-mono">[{modifiedFilename}]</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tag style={{ margin: 0 }}>{modifiedLines} lines</Tag>
              <Tag style={{ margin: 0 }}>{modifiedChars} chars</Tag>
            </div>
          </div>
        }
        extra={
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={modifiedFileRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, setModifiedText, setModifiedFilename);
              }}
            />
            <Tooltip title="Upload local file (or drag and drop)">
              <Button
                size="small"
                type="text"
                icon={<UploadOutlined />}
                onClick={() => modifiedFileRef.current?.click()}
              />
            </Tooltip>
            <Tooltip title="Paste from clipboard">
              <Button
                size="small"
                type="text"
                icon={<SnippetsOutlined />}
                onClick={() => handlePaste(setModifiedText, 'Modified')}
              />
            </Tooltip>
            <Tooltip title="Copy all modified text">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(modifiedText, 'Modified')}
              />
            </Tooltip>
            <Tooltip title="Clear modified text">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => setModifiedText('')}
              />
            </Tooltip>
          </div>
        }
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, setModifiedText, setModifiedFilename)}
      >
        <TextArea
          value={modifiedText}
          onChange={(e) => setModifiedText(e.target.value)}
          placeholder="Paste modified code/text here, or drag & drop a file..."
          rows={7}
          spellCheck={false}
          className="diff-code-font w-full resize-y font-mono text-xs"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </Card>
    </div>
  );
}
