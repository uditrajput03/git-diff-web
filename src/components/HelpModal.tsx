import { Modal, Typography, Space, Divider, Descriptions, Tabs, Collapse } from 'antd';
import {
  CodeOutlined,
  DownloadOutlined,
  SearchOutlined,
  EyeOutlined,
  BranchesOutlined,
  LockOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const guideTabContent = (
    <div className="py-2">
      <Paragraph>
        <strong>Git Diff Web</strong> is an advanced, privacy-first web diff comparator designed for developers, code reviewers, and content editors. Compare code snippets, JSON, markdown, and config files with Monaco editor integration.
      </Paragraph>

      <Divider style={{ margin: '14px 0' }} />

      <Title level={5}><EyeOutlined /> Diff Granularity &amp; View Modes</Title>
      <Paragraph>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Word Diff (Default):</strong> Identifies line modifications and highlights exact word/token additions and deletions within each line.
          </li>
          <li>
            <strong>Character Diff:</strong> Pinpoints character-by-character changes (ideal for typos, cryptographic hashes, or URLs).
          </li>
          <li>
            <strong>Line Diff:</strong> Classical line-by-line block comparison.
          </li>
          <li>
            <strong>Split View:</strong> Side-by-side visual comparison with synchronized scrolling.
          </li>
          <li>
            <strong>Unified View:</strong> Single-column unified patch representation matching terminal <code>git diff</code> output.
          </li>
        </ul>
      </Paragraph>

      <Divider style={{ margin: '14px 0' }} />

      <Title level={5}><SearchOutlined /> In-Diff Search &amp; Navigation</Title>
      <Paragraph>
        Use the search bar in the toolbar (<Text code>Ctrl / Cmd + F</Text>) to instantly locate terms across differences. Cycle through search matches with <Text code>Enter</Text> / <Text code>Shift + Enter</Text> and jump between diff hunks using <Text code>F7</Text>.
      </Paragraph>

      <Divider style={{ margin: '14px 0' }} />

      <Title level={5}><DownloadOutlined /> Exporting &amp; Integrations</Title>
      <Paragraph>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Copy Unified Patch:</strong> Copies a standard Git patch directly to your clipboard.
          </li>
          <li>
            <strong>Export .patch:</strong> Downloads a standard <code>.patch</code> file ready for <code>git apply</code>.
          </li>
          <li>
            <strong>File Upload &amp; Drag-and-Drop:</strong> Drag and drop any code file directly onto the editor panels or click the upload icon.
          </li>
        </ul>
      </Paragraph>
    </div>
  );

  const shortcutsTabContent = (
    <div className="py-2">
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label={<Text code>Ctrl / Cmd + F</Text>}>
          Focus In-Diff Search Bar
        </Descriptions.Item>
        <Descriptions.Item label={<Text code>F7 / Shift + F7</Text>}>
          Jump to Next / Previous Diff Hunk
        </Descriptions.Item>
        <Descriptions.Item label={<Text code>Enter / Shift + Enter</Text>}>
          Jump to Next / Previous Search Match (when search bar is focused)
        </Descriptions.Item>
        <Descriptions.Item label={<Text code>Shift + Alt + S</Text>}>
          Swap Original and Modified texts
        </Descriptions.Item>
        <Descriptions.Item label={<Text code>Shift + Alt + V</Text>}>
          Toggle Split / Unified view
        </Descriptions.Item>
      </Descriptions>
    </div>
  );

  const faqTabContent = (
    <div className="py-2">
      <Collapse
        defaultActiveKey={['1', '2']}
        items={[
          {
            key: '1',
            label: (
              <span className="font-semibold flex items-center gap-1.5">
                <LockOutlined className="text-green-600" />
                Is my code or sensitive data uploaded to any server?
              </span>
            ),
            children: (
              <p className="text-sm">
                <strong>No.</strong> Git Diff Web runs 100% locally in your web browser. Neither your original nor modified text or files are transmitted across the network or stored on any remote server.
              </p>
            ),
          },
          {
            key: '2',
            label: (
              <span className="font-semibold">
                What is the difference between Split and Unified view?
              </span>
            ),
            children: (
              <p className="text-sm">
                <strong>Split View</strong> displays the original and modified documents side-by-side with synchronized scrolling for visual comparison. <strong>Unified View</strong> shows changes in a single column with additions (+) and deletions (-), identical to the standard Git command line diff.
              </p>
            ),
          },
          {
            key: '3',
            label: (
              <span className="font-semibold">
                Which programming languages are supported?
              </span>
            ),
            children: (
              <p className="text-sm">
                Over 20 languages with full syntax highlighting are supported, including TypeScript, JavaScript, Python, JSON, HTML, CSS, Go, Rust, Java, C++, C#, PHP, Ruby, SQL, YAML, Markdown, and Shell.
              </p>
            ),
          },
          {
            key: '4',
            label: (
              <span className="font-semibold">
                Are exported patches compatible with Git CLI?
              </span>
            ),
            children: (
              <p className="text-sm">
                Yes. Clicking <strong>Export .patch</strong> generates an RFC-compliant unified diff file that can be applied directly in any terminal using <code>git apply &lt;filename&gt;.patch</code>.
              </p>
            ),
          },
        ]}
      />
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <BranchesOutlined style={{ color: '#1677ff' }} />
          <span>Git Diff Web – Documentation, Shortcuts &amp; FAQ</span>
        </Space>
      }
      open={open}
      onOk={onClose}
      onCancel={onClose}
      width={720}
      footer={null}
    >
      <Tabs
        defaultActiveKey="guide"
        items={[
          {
            key: 'guide',
            label: (
              <span>
                <BranchesOutlined /> User Guide
              </span>
            ),
            children: guideTabContent,
          },
          {
            key: 'shortcuts',
            label: (
              <span>
                <CodeOutlined /> Shortcuts
              </span>
            ),
            children: shortcutsTabContent,
          },
          {
            key: 'faq',
            label: (
              <span>
                <QuestionCircleOutlined /> FAQ &amp; Privacy
              </span>
            ),
            children: faqTabContent,
          },
        ]}
      />
    </Modal>
  );
}
