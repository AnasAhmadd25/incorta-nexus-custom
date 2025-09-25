import { ExpandOutlined, CompressOutlined } from '@ant-design/icons';
import { Button } from 'antd';

interface ChatLayoutToggleButtonProps {
  isPanelExpanded: boolean;
  onToggle?: () => void;
}

const ChatLayoutToggleButton = ({ isPanelExpanded, onToggle }: ChatLayoutToggleButtonProps) => {
  return (
    <Button
      type="text"
      icon={isPanelExpanded ? <CompressOutlined /> : <ExpandOutlined />}
      onClick={onToggle}
      title={isPanelExpanded ? 'Collapse' : 'Expand'}
    />
  );
};

export default ChatLayoutToggleButton;