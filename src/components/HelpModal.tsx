import { Modal, Typography, Space, Divider, Descriptions } from 'antd';
import {
  CodeOutlined,
  DownloadOutlined,
  SearchOutlined,
  EyeOutlined,
  BranchesOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Modal
      title={
        <Space>
          <BranchesOutlined style={{ color: '#1677ff' }} />
          <span>Git Diff Web - User Guide & Tips</span>
        </Space>
      }
      open={open}
      onOk={onClose}
      onCancel={onClose}
      width={680}
      footer={null}
    >
      <div className="py-2">
        <Paragraph>
          <strong>Git Diff Web</strong> is an advanced web-based diff comparator designed for developers, code reviewers, and content editors.
        </Paragraph>

        <Divider style={{ margin: '16px 0' }} />

        <Title level={5}><EyeOutlined /> Diff Granularity & View Modes</Title>
        <Paragraph>
          <ul>
            <li>
              <strong>Word Diff (Default):</strong> Identifies line modifications and highlights exact word/token additions and deletions within each line.
            </li>
            <li>
              <strong>Character Diff:</strong> Pinpoints character-by-character changes (useful for typo checks, hashes, or URLs).
            </li>
            <li>
              <strong>Line Diff:</strong> Classical line-by-line block comparison.
            </li>
            <li>
              <strong>Split View:</strong> Side-by-side comparison with monotonic sequence alignment.
            </li>
            <li>
              <strong>Unified View:</strong> Single-column unified patch representation.
            </li>
          </ul>
        </Paragraph>

        <Divider style={{ margin: '16px 0' }} />

        <Title level={5}><SearchOutlined /> In-Diff Search & Filters</Title>
        <Paragraph>
          Use the search bar in the toolbar to quickly search across differences. Matches are highlighted directly in the diff view, and can be navigated with Enter and Shift+Enter.
        </Paragraph>

        <Divider style={{ margin: '16px 0' }} />

        <Title level={5}><DownloadOutlined /> Exporting & Integrations</Title>
        <Paragraph>
          <ul>
            <li>
              <strong>Copy Unified Patch:</strong> Copies a standard Git unified patch directly to your clipboard.
            </li>
            <li>
              <strong>Export .patch:</strong> Downloads a standard <code>.patch</code> file that can be applied with <code>git apply</code>.
            </li>
            <li>
              <strong>File Upload:</strong> Drag and drop any text or code file directly onto the editor panels or click the upload icon.
            </li>
          </ul>
        </Paragraph>

        <Divider style={{ margin: '16px 0' }} />

        <Title level={5}><CodeOutlined /> Keyboard Shortcuts</Title>
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label={<Text code>Ctrl / Cmd + F</Text>}>
            Focus In-Diff Search Bar
          </Descriptions.Item>
          <Descriptions.Item label={<Text code>F7 / Shift + F7</Text>}>
            Jump to Next / Previous Diff Hunk
          </Descriptions.Item>
          <Descriptions.Item label={<Text code>Enter / Shift + Enter</Text>}>
            Jump to Next / Previous Search Match (when search is focused)
          </Descriptions.Item>
          <Descriptions.Item label={<Text code>Shift + Alt + S</Text>}>
            Swap Original and Modified texts
          </Descriptions.Item>
          <Descriptions.Item label={<Text code>Shift + Alt + V</Text>}>
            Toggle Split / Unified view
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Modal>
  );
}
