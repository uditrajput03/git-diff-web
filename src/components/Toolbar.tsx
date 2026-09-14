import {
  Segmented,
  Button,
  Switch,
  Dropdown,
  Tooltip,
  Space,
  Input,
  Popconfirm,
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
} from '@ant-design/icons';
import { type Granularity } from '../utils/diff';
import { DIFF_SAMPLES, type DiffSample } from '../utils/samples';

interface ToolbarProps {
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
  onSelectSample: (sample: DiffSample) => void;
  onSwap: () => void;
  onClear: () => void;
  onCopyPatch: () => void;
  onExportPatch: () => void;
}

export function Toolbar({
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
  onSelectSample,
  onSwap,
  onClear,
  onCopyPatch,
  onExportPatch,
}: ToolbarProps) {
  // Build Samples Dropdown Menu
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
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b select-none transition-colors">
      {/* Left side: View Mode & Granularity & Options */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View Mode */}
        <Segmented<'split' | 'unified'>
          value={viewMode}
          onChange={(val) => setViewMode(val)}
          options={[
            {
              label: 'Split View',
              value: 'split',
              icon: <SplitCellsOutlined />,
            },
            {
              label: 'Unified View',
              value: 'unified',
              icon: <BarsOutlined />,
            },
          ]}
        />

        {/* Diff Granularity */}
        <Segmented<Granularity>
          value={granularity}
          onChange={(val) => setGranularity(val)}
          options={[
            { label: 'Word Diff', value: 'word' },
            { label: 'Char Diff', value: 'char' },
            { label: 'Line Diff', value: 'line' },
          ]}
        />

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

          <Tooltip title="Fold unchanged lines into expandable context blocks">
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

          <Tooltip title="Wrap long code lines instead of horizontal scrolling">
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

      {/* Right side: Search, Samples, Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="flex items-center gap-1">
          <Input
            placeholder="Search in diff (Ctrl+F)..."
            prefix={<SearchOutlined style={{ opacity: 0.5 }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="middle"
            style={{ width: 220 }}
            suffix={
              searchQuery.trim() ? (
                <span className="text-xs opacity-60">
                  {searchMatchCount > 0 ? `${currentMatchIndex + 1}/${searchMatchCount}` : '0 found'}
                </span>
              ) : null
            }
          />

          {searchQuery.trim() && searchMatchCount > 0 && (
            <Space.Compact size="middle">
              <Tooltip title="Previous match">
                <Button icon={<UpOutlined />} onClick={onPrevMatch} />
              </Tooltip>
              <Tooltip title="Next match">
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

        {/* Toggle Editor Inputs Visibility */}
        <Tooltip title={showInputs ? 'Hide input textareas to maximize diff' : 'Show input textareas'}>
          <Button
            icon={showInputs ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowInputs(!showInputs)}
          >
            {showInputs ? 'Hide Editors' : 'Show Editors'}
          </Button>
        </Tooltip>

        {/* Swap */}
        <Tooltip title="Swap Before and After inputs (Shift+Alt+S)">
          <Button icon={<SwapOutlined />} onClick={onSwap}>
            Swap
          </Button>
        </Tooltip>

        {/* Clear with Popconfirm */}
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
        <Tooltip title="Download .patch file to apply with git apply">
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
