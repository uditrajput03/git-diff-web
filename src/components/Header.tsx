import { Tag, Space, Switch, Button, Tooltip } from 'antd';
import {
  BranchesOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  EditOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  BulbFilled,
  GithubOutlined,
} from '@ant-design/icons';
import { type DiffMetrics } from '../utils/diff';

interface HeaderProps {
  metrics: DiffMetrics;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenHelp: () => void;
}

export function Header({
  metrics,
  isDarkMode,
  onToggleTheme,
  onOpenHelp,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b shadow-sm transition-colors select-none">
      <div className="flex items-center gap-3">
        <div className="flex orientation-row items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
            <BranchesOutlined style={{ fontSize: '18px' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight">Git Diff Web</span>
              <Tag color="processing" style={{ margin: 0, fontSize: '11px', lineHeight: '18px' }}>
                v2.0
              </Tag>
            </div>
            <span className="text-xs opacity-60 hidden sm:inline">
              Smart Word & Character Code Comparator
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Diff Metrics */}
        <div className="hidden md:flex items-center gap-1.5">
          <Tooltip title="Added lines">
            <Tag
              icon={<PlusCircleOutlined />}
              color="success"
              style={{ fontWeight: 600, padding: '2px 8px' }}
            >
              +{metrics.additions}
            </Tag>
          </Tooltip>

          <Tooltip title="Deleted lines">
            <Tag
              icon={<MinusCircleOutlined />}
              color="error"
              style={{ fontWeight: 600, padding: '2px 8px' }}
            >
              -{metrics.deletions}
            </Tag>
          </Tooltip>

          {metrics.modifications > 0 && (
            <Tooltip title="Modified line pairs with intra-line differences">
              <Tag
                icon={<EditOutlined />}
                color="warning"
                style={{ fontWeight: 600, padding: '2px 8px' }}
              >
                ~{metrics.modifications}
              </Tag>
            </Tooltip>
          )}

          <Tooltip title="Unchanged lines">
            <Tag
              icon={<CheckCircleOutlined />}
              color="default"
              style={{ fontWeight: 500, padding: '2px 8px' }}
            >
              {metrics.unchanged} unchanged
            </Tag>
          </Tooltip>
        </div>

        {/* Action Controls */}
        <Space size="middle">
          <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <Switch
              checked={isDarkMode}
              onChange={onToggleTheme}
              checkedChildren={<BulbFilled style={{ fontSize: '12px' }} />}
              unCheckedChildren={<BulbOutlined style={{ fontSize: '12px' }} />}
            />
          </Tooltip>

          <Tooltip title="Keyboard shortcuts & User Guide">
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={onOpenHelp}
              size="middle"
            />
          </Tooltip>

          <Tooltip title="View repository">
            <Button
              type="text"
              icon={<GithubOutlined />}
              href="https://github.com/uditrajput03/git-diff-web"
              target="_blank"
              size="middle"
            />
          </Tooltip>
        </Space>
      </div>
    </header>
  );
}
