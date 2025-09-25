import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/contexts/ChatContext';
import { 
  Badge,
  Divider,
  Popconfirm,
  Popover,
  Radio,
  Switch,
  Tooltip,
  Button,
  Space,
  Typography 
} from 'antd';
import classNames from 'classnames';
import { 
  CloseOutlined, 
  DatabaseOutlined, 
  SettingOutlined, 
  UndoOutlined,
  SendOutlined 
} from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import ChatContainer from './CopilotChatWindow/ChatContainer/ChatContainer';
import ConnectionStatus from './ConnectionStatus';
import AuthForm from './AuthForm';
import ChatInput from './ChatInput';
import ModelSelector from './ModelSelector';
import './FullScreenChatInterface.less';

export const INCORTA_COPILOT = 'Incorta Nexus';

const { Text } = Typography;

const FullScreenChatInterface: React.FC = () => {
  const { 
    messages, 
    sendMessage, 
    clearMessages, 
    isConnected, 
    isThinking,
    isAuthenticated,
    currentModel
  } = useChat();
  
  const [searchValue, setSearchValue] = useState('');
  const [showSchemaSelectionPanel, setShowSchemaSelectionPanel] = useState(false);
  const [isSchemaSelected, setIsSchemaSelected] = useState(false);
  const [chatSettings, setChatSettings] = useState({
    enable_summary: true,
    verbosity: 'detailed' as 'detailed' | 'brief'
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = window.innerWidth <= 768;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Show authentication form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="full-screen-chat">
        <div className="chat-header">
          <div className="chat-header__title">
            <h1>{INCORTA_COPILOT}</h1>
          </div>
        </div>
        <ConnectionStatus />
        <div className="auth-container">
          <AuthForm />
        </div>
      </div>
    );
  }

  const resetState = () => {
    setSearchValue('');
    clearMessages();
  };

  const SchemaSelectionIcon = () => (
    <DatabaseOutlined
      className={classNames({
        'schema-selection-disabled': isThinking,
        'schema-selection-selected': isSchemaSelected
      })}
      onClick={() => {
        if (!isThinking) {
          setShowSchemaSelectionPanel(true);
        }
      }}
      title="Browse Schemas"
    />
  );

  return (
    <div className="full-screen-chat">
      {/* Authentication Form - Show when not authenticated */}
      {!isAuthenticated && (
        <div className="auth-overlay" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.1)'
        }}>
          <AuthForm />
        </div>
      )}
      
      {/* Main Chat Interface - Show when authenticated */}
      {isAuthenticated && (
        <>
          {/* Header */}
          <div className="chat-header">
        <div className="chat-header__title">
          <h1>{INCORTA_COPILOT}</h1>
        </div>
        
        <div className="chat-header__actions">
          <Popconfirm
            overlayClassName="reset-btn-popconfirm"
            placement="bottom"
            title={
              <div>
                <div className="reset-btn-popconfirm_title">
                  <FormattedMessage id="dashboard.ai.actions.clear_chat_history.title" defaultMessage="Clear Chat History" />
                </div>
                <div className="reset-btn-popconfirm_subtitle">
                  <FormattedMessage id="dashboard.ai.actions.clear_chat_history.description" defaultMessage="This will clear all messages in the current conversation." />
                </div>
              </div>
            }
            onConfirm={resetState}
            okText="Clear"
            cancelText="Cancel"
          >
            <UndoOutlined
              title="Reset Conversation"
              className="header-action-icon"
            />
          </Popconfirm>
          
          <Popover
            title="Settings"
            overlayClassName="user-controls-popover-container"
            content={
              <div className="user-controls">
                <div className="user-controls__summary">
                  <div className="option">
                    <span className="option__title">Summary</span>
                    <span className="option__description">Highlight key insights.</span>
                  </div>
                  <Switch
                    checked={chatSettings.enable_summary}
                    onChange={e => {
                      setChatSettings({
                        ...chatSettings,
                        enable_summary: e
                      });
                    }}
                  />
                </div>
                {chatSettings.enable_summary && (
                  <>
                    <Divider type="horizontal" style={{ margin: 0, opacity: 0.6 }} />
                    <div className="user-controls__verbosity">
                      <div className="option">
                        <span className="option__title">Verbosity</span>
                        <span className="option__description">Set answer detail level.</span>
                      </div>
                      <Radio.Group
                        value={chatSettings.verbosity}
                        size="small"
                        onChange={e => {
                          setChatSettings({
                            ...chatSettings,
                            verbosity: e?.target?.value
                          });
                        }}
                      >
                        <Radio.Button value="detailed">Detailed</Radio.Button>
                        <Radio.Button value="brief">Brief</Radio.Button>
                      </Radio.Group>
                    </div>
                  </>
                )}
              </div>
            }
            trigger={'click'}
          >
            <SettingOutlined className="header-action-icon" />
          </Popover>
          
          <Tooltip
            title={
              isThinking &&
              "Answer generation in progress"
            }
          >
            {isSchemaSelected ? (
              <Badge dot size="small" color="#37517e">
                <SchemaSelectionIcon />
              </Badge>
            ) : (
              <SchemaSelectionIcon />
            )}
          </Tooltip>
          
          {/* Model Selector */}
          <ModelSelector />
        </div>
      </div>

      {/* Connection Status */}
      <ConnectionStatus />

      {/* Chat Content */}
      <div className="chat-content">
        {messages.filter(msg => 
          (msg.type === 'user' || msg.type === 'assistant') && 
          !msg.content.includes('Successfully authenticated')
        ).length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="welcome-section"
          >
            <div className="welcome-content">
              <div className="welcome-logo" style={{ 
                textAlign: 'center', 
                marginBottom: '40px',
                paddingTop: '60px'
              }}>
                <img 
                  src="/copilot-icon.svg" 
                  alt="Copilot" 
                  style={{ 
                    width: '120px', 
                    height: '120px',
                    margin: '0 auto',
                    display: 'block'
                  }}
                />
              </div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h2>Hi there! I am Incorta Nexus. How can I help you today?</h2>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="messages-container">
            <ChatContainer
              messages={messages.filter(message => !message.type.includes('error'))}
              generateAnswer={(params: any) => sendMessage(params.question)}
              openSchemaSelectionDialog={(options: any) => setShowSchemaSelectionPanel(!!options)}
            />
            
            {/* Thinking Indicator */}
            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="thinking-indicator"
                >
                  <div className="thinking-avatar">
                    <img src="/copilot-icon.svg" alt="Copilot" />
                  </div>
                  <div className="thinking-content">
                    <div className="thinking-dots">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                    <span>Thinking...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="chat-input-section">
        <ChatInput />
        <div className="inc-augmented-analytics-disclaimer">
          <Text type="secondary" className="inc-augmented-analytics-disclaimer-text">
            This Incorta Nexus version supports {currentModel === 'claude' ? 'Anthropic Claude 3.5 Sonnet' : 'Google Gemini 2.5 Flash Lite'} API
          </Text>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default FullScreenChatInterface;