import {
  Segmented,
  Button,
  Switch,
  Dropdown,
  Tooltip,
  Space,
  Input,
  Popconfirm,
  Select,
  type MenuProps,
} from 'antd';
import {
  SplitCellsOutlined,
  BarsOutlined,
  SwapOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  UpOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  CodeOutlined,
  GithubOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { type Granularity } from '../utils/diff';
import { DIFF_SAMPLES, type DiffSample } from '../utils/samples';

export type DiffEngine = 'monaco' | 'github';

const SUPPORTED_LANGUAGES = [
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSON', value: 'json' },
  { label: 'Python', value: 'python' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SQL', value: 'sql' },
  { label: 'Shell / Bash', value: 'shell' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'Plain Text', value: 'plaintext' },
];

interface ToolbarProps {
  diffEngine: DiffEngine;
  setDiffEngine: (engine: DiffEngine) => void;
  language: string;
  setLanguage: (lang: string) => void;
  viewMode: 'split' | 'unified';
  setViewMode: (mode: 'split' | 'unified') => void;
  granularity: Granularity;
  setGranularity: (granularity: Granularity) => void;
  ignoreWhitespace: boolean;
  setIgnoreWhitespace: (val: boolean) => void;
  ignoreCase: boolean;
  setIgnoreCase: (val: boolean) => void;
  wordWrap: boolean;
  setWordWrap: (val: boolean) => void;
  foldUnchanged: boolean;
  setFoldUnchanged: (val: boolean) => void;
  showInputs: boolean;
  setShowInputs: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchMatchCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onNextDiffHunk: () => void;
  onPrevDiffHunk: () => void;
  onSelectSample: (sample: DiffSample) => void;
  onSwap: () => void;
  onClear: () => void;
  onCopyPatch: () => void;
  onExportPatch: () => void;
}

export function Toolbar({
  diffEngine,
  setDiffEngine,
  language,
  setLanguage,
  viewMode,
  setViewMode,
  granularity,
  setGranularity,
  ignoreWhitespace,
  setIgnoreWhitespace,
  ignoreCase,
  setIgnoreCase,
  wordWrap,
  setWordWrap,
  foldUnchanged,
  setFoldUnchanged,
  showInputs,
  setShowInputs,
  searchQuery,
  setSearchQuery,
  searchMatchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  onNextDiffHunk,
  onPrevDiffHunk,
  onSelectSample,
  onSwap,
  onClear,
  onCopyPatch,
  onExportPatch,
}: ToolbarProps) {
  const sampleMenuItems: MenuProps['items'] = DIFF_SAMPLES.map((sample) => ({
    key: sample.id,
    label: (
      <div>
        <div className="font-semibold">{sample.name}</div>
        <div className="text-xs opacity-60">{sample.description}</div>
      </div>
    ),
    onClick: () => onSelectSample(sample),
  }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b select-none transition-colors">
      {/* Left section: Diff Engine, View Mode, Language, Toggles */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Diff Engine Selector: VS Code vs GitHub */}
        <Tooltip title="Choose between the real VS Code Monaco diff editor or GitHub Web PR table view">
          <Segmented<DiffEngine>
            value={diffEngine}
            onChange={(val) => setDiffEngine(val)}
            options={[
              {
                label: 'VS Code Diff',
                value: 'monaco',
                icon: <CodeOutlined />,
              },
              {
                label: 'GitHub Diff',
                value: 'github',
                icon: <GithubOutlined />,
              },
            ]}
          />
        </Tooltip>

        {/* View Mode (Split / Unified) */}
        <Segmented<'split' | 'unified'>
          value={viewMode}
          onChange={(val) => setViewMode(val)}
          options={[
            {
              label: 'Split',
              value: 'split',
              icon: <SplitCellsOutlined />,
            },
            {
              label: 'Unified',
              value: 'unified',
              icon: <BarsOutlined />,
            },
          ]}
        />

        {/* Language Selector */}
        <Select
          value={language}
          onChange={setLanguage}
          options={SUPPORTED_LANGUAGES}
          size="middle"
          style={{ width: 130 }}
          title="Syntax Language"
        />

        {/* Granularity (for GitHub mode) */}
        {diffEngine === 'github' && (
          <Segmented<Granularity>
            value={granularity}
            onChange={(val) => setGranularity(val)}
            options={[
              { label: 'Word', value: 'word' },
              { label: 'Char', value: 'char' },
              { label: 'Line', value: 'line' },
            ]}
          />
        )}

        {/* Jump between diff hunks */}
        <Space.Compact size="middle">
          <Tooltip title="Previous Change (Shift+F7 / Up)">
            <Button icon={<ArrowUpOutlined />} onClick={onPrevDiffHunk}>
              Prev Diff
            </Button>
          </Tooltip>
          <Tooltip title="Next Change (F7 / Down)">
            <Button icon={<ArrowDownOutlined />} onClick={onNextDiffHunk}>
              Next Diff
            </Button>
          </Tooltip>
        </Space.Compact>

        {/* Display Switches */}
        <div className="flex items-center gap-3 border-l pl-3">
          <Tooltip title="Ignore leading and trailing whitespace differences">
            <div className="flex items-center gap-1 text-xs cursor-pointer">
              <Switch
                size="small"
                checked={ignoreWhitespace}
                onChange={setIgnoreWhitespace}
              />
              <span onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}>
                Ignore Spaces
              </span>
            </div>
          </Tooltip>

          {diffEngine === 'github' && (
            <>
              <Tooltip title="Perform case-insensitive comparison">
                <div className="flex items-center gap-1 text-xs cursor-pointer">
                  <Switch
                    size="small"
                    checked={ignoreCase}
                    onChange={setIgnoreCase}
                  />
                  <span onClick={() => setIgnoreCase(!ignoreCase)}>
                    Ignore Case
                  </span>
                </div>
              </Tooltip>

              <Tooltip title="Fold large sections of unchanged lines">
                <div className="flex items-center gap-1 text-xs cursor-pointer">
                  <Switch
                    size="small"
                    checked={foldUnchanged}
                    onChange={setFoldUnchanged}
                  />
                  <span onClick={() => setFoldUnchanged(!foldUnchanged)}>
                    Fold Context
                  </span>
                </div>
              </Tooltip>
            </>
          )}

          <Tooltip title="Wrap long lines instead of horizontal scrolling">
            <div className="flex items-center gap-1 text-xs cursor-pointer">
              <Switch
                size="small"
                checked={wordWrap}
                onChange={setWordWrap}
              />
              <span onClick={() => setWordWrap(!wordWrap)}>
                Word Wrap
              </span>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Right section: Search, Samples, Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex items-center gap-1">
          <Input
            placeholder="Search in diff..."
            prefix={<SearchOutlined style={{ opacity: 0.5 }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="middle"
            style={{ width: 190 }}
            suffix={
              searchQuery.trim() ? (
                <span className="text-xs opacity-60">
                  {searchMatchCount > 0 ? `${currentMatchIndex + 1}/${searchMatchCount}` : '0'}
                </span>
              ) : null
            }
          />

          {searchQuery.trim() && searchMatchCount > 0 && (
            <Space.Compact size="middle">
              <Tooltip title="Previous search match">
                <Button icon={<UpOutlined />} onClick={onPrevMatch} />
              </Tooltip>
              <Tooltip title="Next search match">
                <Button icon={<DownOutlined />} onClick={onNextMatch} />
              </Tooltip>
            </Space.Compact>
          )}
        </div>

        {/* Load Samples Dropdown */}
        <Dropdown menu={{ items: sampleMenuItems }} placement="bottomRight">
          <Button icon={<FolderOpenOutlined />}>
            Samples
          </Button>
        </Dropdown>

        {/* Show / Hide Textareas */}
        <Tooltip title={showInputs ? 'Hide input editors to give full height to the diff' : 'Show input editors'}>
          <Button
            icon={showInputs ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowInputs(!showInputs)}
          >
            {showInputs ? 'Hide Editors' : 'Show Editors'}
          </Button>
        </Tooltip>

        {/* Swap */}
        <Tooltip title="Swap Original and Modified texts (Shift+Alt+S)">
          <Button icon={<SwapOutlined />} onClick={onSwap}>
            Swap
          </Button>
        </Tooltip>

        {/* Clear */}
        <Popconfirm
          title="Clear both inputs?"
          description="Are you sure you want to clear both original and modified texts?"
          onConfirm={onClear}
          okText="Yes, Clear"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button danger icon={<DeleteOutlined />}>
            Clear
          </Button>
        </Popconfirm>

        {/* Copy Patch */}
        <Tooltip title="Copy standard Git Unified Patch to clipboard">
          <Button type="default" icon={<CopyOutlined />} onClick={onCopyPatch}>
            Copy Patch
          </Button>
        </Tooltip>

        {/* Export .patch */}
        <Tooltip title="Download .patch file">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={onExportPatch}
          >
            Export .patch
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
