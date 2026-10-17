import React, { useRef, useState } from 'react';
import { Card, Button, Tooltip, Input, App as AntdApp } from 'antd';
import {
  UploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  SnippetsOutlined,
  FileTextOutlined,
  EditOutlined,
  CheckOutlined,
} from '@ant-design/icons';

interface InputsProps {
  originalText: string;
  modifiedText: string;
  setOriginalText: (text: string) => void;
  setModifiedText: (text: string) => void;
  originalFilename: string;
  modifiedFilename: string;
  setOriginalFilename: (name: string) => void;
  setModifiedFilename: (name: string) => void;
  isDarkMode: boolean;
}

export function Inputs({
  originalText,
  modifiedText,
  setOriginalText,
  setModifiedText,
  originalFilename,
  modifiedFilename,
  setOriginalFilename,
  setModifiedFilename,
  isDarkMode,
}: InputsProps) {
  const { message } = AntdApp.useApp();
  const originalFileRef = useRef<HTMLInputElement>(null);
  const modifiedFileRef = useRef<HTMLInputElement>(null);

  const [editingOriginalName, setEditingOriginalName] = useState(false);
  const [editingModifiedName, setEditingModifiedName] = useState(false);
  const [origNameInput, setOrigNameInput] = useState(originalFilename);
  const [modNameInput, setModNameInput] = useState(modifiedFilename);

  const [origDragOver, setOrigDragOver] = useState(false);
  const [modDragOver, setModDragOver] = useState(false);

  const handleFileUpload = (
    file: File,
    setText: (text: string) => void,
    setFilename: (name: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setText(text);
      setFilename(file.name);
      message.success(`Loaded file: ${file.name}`);
    };
    reader.onerror = () => {
      message.error(`Failed to read file ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handlePasteClipboard = async (setText: (text: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        message.info('Clipboard is empty');
        return;
      }
      setText(text);
      message.success('Pasted from clipboard');
    } catch {
      message.error('Unable to access clipboard. Please check browser permissions.');
    }
  };

  const handleCopy = (text: string) => {
    if (!text) {
      message.info('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => message.success('Copied to clipboard'))
      .catch(() => message.error('Failed to copy'));
  };

  const handleFileDrop = (
    e: React.DragEvent<HTMLDivElement>,
    setText: (text: string) => void,
    setFilename: (name: string) => void,
    setDragState: (val: boolean) => void
  ) => {
    e.preventDefault();
    setDragState(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0], setText, setFilename);
    }
  };

  const saveOriginalName = () => {
    const trimmed = origNameInput.trim() || 'original';
    setOriginalFilename(trimmed);
    setEditingOriginalName(false);
  };

  const saveModifiedName = () => {
    const trimmed = modNameInput.trim() || 'modified';
    setModifiedFilename(trimmed);
    setEditingModifiedName(false);
  };

  const originalStats = {
    lines: originalText ? originalText.split('\n').length : 0,
    chars: originalText.length,
  };

  const modifiedStats = {
    lines: modifiedText ? modifiedText.split('\n').length : 0,
    chars: modifiedText.length,
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 px-4 pb-3">
      {/* Hidden file inputs with value clearing for repeat uploads */}
      <input
        type="file"
        ref={originalFileRef}
        className="hidden"
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, setOriginalText, setOriginalFilename);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={modifiedFileRef}
        className="hidden"
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file, setModifiedText, setModifiedFilename);
          e.target.value = '';
        }}
      />

      {/* Original (Before) Card */}
      <Card
        size="small"
        className={`flex-1 shadow-sm transition-all duration-200 ${
          origDragOver ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        style={{
          backgroundColor: isDarkMode ? '#161b22' : '#ffffff',
          borderColor: origDragOver ? '#1677ff' : isDarkMode ? '#30363d' : '#d0d7de',
        }}
        styles={{ body: { padding: '8px' }, header: { padding: '8px 12px' } }}
        onDragOver={(e) => {
          e.preventDefault();
          setOrigDragOver(true);
        }}
        onDragLeave={() => setOrigDragOver(false)}
        onDrop={(e) => handleFileDrop(e, setOriginalText, setOriginalFilename, setOrigDragOver)}
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 max-w-[70%]">
              <FileTextOutlined style={{ color: '#ff4d4f' }} />
              <span className="font-semibold text-sm">Original (Before)</span>
              {editingOriginalName ? (
                <div className="flex items-center gap-1">
                  <Input
                    size="small"
                    value={origNameInput}
                    onChange={(e) => setOrigNameInput(e.target.value)}
                    onPressEnter={saveOriginalName}
                    onBlur={saveOriginalName}
                    autoFocus
                    className="font-mono text-xs w-36"
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                    onClick={saveOriginalName}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 cursor-pointer group rounded px-1 hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => {
                    setOrigNameInput(originalFilename);
                    setEditingOriginalName(true);
                  }}
                  title="Click to rename file"
                >
                  <span className="text-xs opacity-75 font-mono truncate max-w-[180px]">
                    [{originalFilename}]
                  </span>
                  <EditOutlined className="text-[11px] opacity-40 group-hover:opacity-100" />
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {originalStats.lines} lines &middot; {originalStats.chars} chars
            </span>
          </div>
        }
        extra={
          <div className="flex items-center gap-1">
            <Tooltip title="Upload local file (or drag & drop)">
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
                onClick={() => handlePasteClipboard(setOriginalText)}
              />
            </Tooltip>
            <Tooltip title="Copy all text">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(originalText)}
              />
            </Tooltip>
            <Tooltip title="Clear editor">
              <Button
                size="small"
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => {
                  setOriginalText('');
                  message.info('Cleared original editor');
                }}
              />
            </Tooltip>
          </div>
        }
      >
        <textarea
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          placeholder="Paste or type original code here, or drop a file..."
          className="w-full h-36 p-2 rounded text-xs font-mono resize-y outline-none transition-colors border"
          style={{
            backgroundColor: isDarkMode ? '#0d1117' : '#f6f8fa',
            color: isDarkMode ? '#e6edf3' : '#1f2328',
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
          }}
          spellCheck={false}
        />
      </Card>

      {/* Modified (After) Card */}
      <Card
        size="small"
        className={`flex-1 shadow-sm transition-all duration-200 ${
          modDragOver ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        style={{
          backgroundColor: isDarkMode ? '#161b22' : '#ffffff',
          borderColor: modDragOver ? '#1677ff' : isDarkMode ? '#30363d' : '#d0d7de',
        }}
        styles={{ body: { padding: '8px' }, header: { padding: '8px 12px' } }}
        onDragOver={(e) => {
          e.preventDefault();
          setModDragOver(true);
        }}
        onDragLeave={() => setModDragOver(false)}
        onDrop={(e) => handleFileDrop(e, setModifiedText, setModifiedFilename, setModDragOver)}
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 max-w-[70%]">
              <FileTextOutlined style={{ color: '#52c41a' }} />
              <span className="font-semibold text-sm">Modified (After)</span>
              {editingModifiedName ? (
                <div className="flex items-center gap-1">
                  <Input
                    size="small"
                    value={modNameInput}
                    onChange={(e) => setModNameInput(e.target.value)}
                    onPressEnter={saveModifiedName}
                    onBlur={saveModifiedName}
                    autoFocus
                    className="font-mono text-xs w-36"
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                    onClick={saveModifiedName}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 cursor-pointer group rounded px-1 hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => {
                    setModNameInput(modifiedFilename);
                    setEditingModifiedName(true);
                  }}
                  title="Click to rename file"
                >
                  <span className="text-xs opacity-75 font-mono truncate max-w-[180px]">
                    [{modifiedFilename}]
                  </span>
                  <EditOutlined className="text-[11px] opacity-40 group-hover:opacity-100" />
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {modifiedStats.lines} lines &middot; {modifiedStats.chars} chars
            </span>
          </div>
        }
        extra={
          <div className="flex items-center gap-1">
            <Tooltip title="Upload local file (or drag & drop)">
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
                onClick={() => handlePasteClipboard(setModifiedText)}
              />
            </Tooltip>
            <Tooltip title="Copy all text">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(modifiedText)}
              />
            </Tooltip>
            <Tooltip title="Clear editor">
              <Button
                size="small"
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => {
                  setModifiedText('');
                  message.info('Cleared modified editor');
                }}
              />
            </Tooltip>
          </div>
        }
      >
        <textarea
          value={modifiedText}
          onChange={(e) => setModifiedText(e.target.value)}
          placeholder="Paste or type modified code here, or drop a file..."
          className="w-full h-36 p-2 rounded text-xs font-mono resize-y outline-none transition-colors border"
          style={{
            backgroundColor: isDarkMode ? '#0d1117' : '#f6f8fa',
            color: isDarkMode ? '#e6edf3' : '#1f2328',
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
          }}
          spellCheck={false}
        />
      </Card>
    </div>
  );
}
