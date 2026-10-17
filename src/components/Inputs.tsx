import React, { useState, useRef } from 'react';
import { Card, Button, Tooltip, Input, App as AntdApp } from 'antd';
import {
  UploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  FileTextOutlined,
  EditOutlined,
  CheckOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';

interface InputsProps {
  originalText: string;
  modifiedText: string;
  setOriginalText: (val: string) => void;
  setModifiedText: (val: string) => void;
  originalFilename: string;
  modifiedFilename: string;
  setOriginalFilename: (val: string) => void;
  setModifiedFilename: (val: string) => void;
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

  // In-place filename editing
  const [editingOriginalName, setEditingOriginalName] = useState(false);
  const [origNameInput, setOrigNameInput] = useState(originalFilename);
  const [editingModifiedName, setEditingModifiedName] = useState(false);
  const [modNameInput, setModNameInput] = useState(modifiedFilename);

  // Drag and drop visual cues
  const [origDragOver, setOrigDragOver] = useState(false);
  const [modDragOver, setModDragOver] = useState(false);

  const handleFileUpload = (
    file: File,
    setText: (text: string) => void,
    setFilename: (name: string) => void
  ) => {
    if (file.size > 2 * 1024 * 1024) {
      message.error(`File "${file.name}" is too large (max 2MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
      setFilename(file.name);
      message.success(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.onerror = () => {
      message.error(`Failed to read "${file.name}"`);
    };
    reader.readAsText(file);
  };

  const handleCopy = (text: string) => {
    if (!text) {
      message.warning('Nothing to copy');
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => message.success('Copied text to clipboard!'))
      .catch(() => message.error('Failed to copy'));
  };

  const handlePasteClipboard = async (setText: (text: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setText(text);
        message.success('Pasted from clipboard');
      } else {
        message.info('Clipboard is empty');
      }
    } catch {
      message.info('Paste via Ctrl+V / Cmd+V directly in the editor');
    }
  };

  const handleFileDrop = (
    e: React.DragEvent,
    setText: (text: string) => void,
    setFilename: (name: string) => void,
    setDrag: (state: boolean) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0], setText, setFilename);
    }
  };

  const saveOriginalName = () => {
    const trimmed = origNameInput.trim();
    if (trimmed) {
      setOriginalFilename(trimmed);
    } else {
      setOrigNameInput(originalFilename);
    }
    setEditingOriginalName(false);
  };

  const saveModifiedName = () => {
    const trimmed = modNameInput.trim();
    if (trimmed) {
      setModifiedFilename(trimmed);
    } else {
      setModNameInput(modifiedFilename);
    }
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
    <div className="flex flex-row gap-2.5 px-4 pb-2 flex-shrink-0">
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
        className={`flex-1 min-w-0 shadow-sm transition-all duration-200 ${
          origDragOver ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        style={{
          backgroundColor: isDarkMode ? '#161b22' : '#ffffff',
          borderColor: origDragOver ? '#1677ff' : isDarkMode ? '#30363d' : '#d0d7de',
        }}
        styles={{ body: { padding: '6px 8px' }, header: { padding: '5px 8px' } }}
        onDragOver={(e) => {
          e.preventDefault();
          setOrigDragOver(true);
        }}
        onDragLeave={() => setOrigDragOver(false)}
        onDrop={(e) => handleFileDrop(e, setOriginalText, setOriginalFilename, setOrigDragOver)}
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileTextOutlined style={{ color: '#ff4d4f' }} />
              <span className="font-semibold text-xs whitespace-nowrap">Original (Before)</span>
              {editingOriginalName ? (
                <div className="flex items-center gap-1">
                  <Input
                    size="small"
                    value={origNameInput}
                    onChange={(e) => setOrigNameInput(e.target.value)}
                    onPressEnter={saveOriginalName}
                    onBlur={saveOriginalName}
                    autoFocus
                    className="font-mono text-xs w-28"
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<CheckOutlined />}
                    onClick={saveOriginalName}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 cursor-pointer group rounded px-1 hover:bg-black/5 dark:hover:bg-white/10 min-w-0"
                  onClick={() => {
                    setOrigNameInput(originalFilename);
                    setEditingOriginalName(true);
                  }}
                  title="Click to rename file"
                >
                  <span className="text-xs opacity-75 font-mono truncate max-w-[100px]">
                    [{originalFilename}]
                  </span>
                  <EditOutlined className="text-[10px] opacity-40 group-hover:opacity-100" />
                </div>
              )}
            </div>
            <span className="text-[11px] text-gray-500 font-mono whitespace-nowrap ml-1">
              {originalStats.lines}L &middot; {originalStats.chars}C
            </span>
          </div>
        }
        extra={
          <div className="flex items-center gap-0.5">
            <Tooltip title="Upload file (or drag & drop)">
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
            <Tooltip title="Copy original text">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(originalText)}
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
      >
        <textarea
          value={originalText}
          onChange={(e) => setOriginalText(e.target.value)}
          placeholder="Paste or type original text here, or drop a file..."
          className="w-full h-16 p-2 rounded text-xs font-mono resize-y outline-none transition-colors border"
          style={{
            backgroundColor: isDarkMode ? '#0d1117' : '#f6f8fa',
            color: isDarkMode ? '#e6edf3' : '#1f2328',
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
          }}
        />
      </Card>

      {/* Modified (After) Card */}
      <Card
        size="small"
        className={`flex-1 min-w-0 shadow-sm transition-all duration-200 ${
          modDragOver ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        style={{
          backgroundColor: isDarkMode ? '#161b22' : '#ffffff',
          borderColor: modDragOver ? '#1677ff' : isDarkMode ? '#30363d' : '#d0d7de',
        }}
        styles={{ body: { padding: '6px 8px' }, header: { padding: '5px 8px' } }}
        onDragOver={(e) => {
          e.preventDefault();
          setModDragOver(true);
        }}
        onDragLeave={() => setModDragOver(false)}
        onDrop={(e) => handleFileDrop(e, setModifiedText, setModifiedFilename, setModDragOver)}
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileTextOutlined style={{ color: '#52c41a' }} />
              <span className="font-semibold text-xs whitespace-nowrap">Modified (After)</span>
              {editingModifiedName ? (
                <div className="flex items-center gap-1">
                  <Input
                    size="small"
                    value={modNameInput}
                    onChange={(e) => setModNameInput(e.target.value)}
                    onPressEnter={saveModifiedName}
                    onBlur={saveModifiedName}
                    autoFocus
                    className="font-mono text-xs w-28"
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<CheckOutlined />}
                    onClick={saveModifiedName}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 cursor-pointer group rounded px-1 hover:bg-black/5 dark:hover:bg-white/10 min-w-0"
                  onClick={() => {
                    setModNameInput(modifiedFilename);
                    setEditingModifiedName(true);
                  }}
                  title="Click to rename file"
                >
                  <span className="text-xs opacity-75 font-mono truncate max-w-[100px]">
                    [{modifiedFilename}]
                  </span>
                  <EditOutlined className="text-[10px] opacity-40 group-hover:opacity-100" />
                </div>
              )}
            </div>
            <span className="text-[11px] text-gray-500 font-mono whitespace-nowrap ml-1">
              {modifiedStats.lines}L &middot; {modifiedStats.chars}C
            </span>
          </div>
        }
        extra={
          <div className="flex items-center gap-0.5">
            <Tooltip title="Upload file (or drag & drop)">
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
            <Tooltip title="Copy modified text">
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopy(modifiedText)}
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
      >
        <textarea
          value={modifiedText}
          onChange={(e) => setModifiedText(e.target.value)}
          placeholder="Paste or type modified text here, or drop a file..."
          className="w-full h-16 p-2 rounded text-xs font-mono resize-y outline-none transition-colors border"
          style={{
            backgroundColor: isDarkMode ? '#0d1117' : '#f6f8fa',
            color: isDarkMode ? '#e6edf3' : '#1f2328',
            borderColor: isDarkMode ? '#30363d' : '#d0d7de',
          }}
        />
      </Card>
    </div>
  );
}
