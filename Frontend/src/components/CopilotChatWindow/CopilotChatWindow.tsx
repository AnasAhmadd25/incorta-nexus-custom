import React, { useEffect, useState } from 'react';
import {
  Badge,
  Divider,
  Drawer,
  DrawerProps,
  Popconfirm,
  Popover,
  Radio,
  Switch,
  Tooltip
} from 'antd';
import classNames from 'classnames';
import { CloseOutlined, DatabaseOutlined, SettingOutlined, UndoOutlined } from '@ant-design/icons';
import { FormattedMessage } from 'react-intl';
import { useChat } from '@/contexts/ChatContext';
import ChatSearchSection from './ChatSearchSection/ChatSearchSection';
import ChatContainer from './ChatContainer/ChatContainer';
import './CopilotChatWindow.less';
import ChatLayoutToggleButton from './ChatLayoutToggleButton/ChatLayoutToggleButton';
import ChatIntro from './ChatIntro/ChatIntro';
import SchemaContextSelection from './SchemaContextSelection/SchemaContextSelection';

export interface ContextSwitchOptions {
  activeContext: string;
  options: {
    label: string;
    value: string;
    color: string;
    bgColor?: string;
    onClick: (label: string) => void;
    tooltip: string;
  }[];
}

export const INCORTA_COPILOT = 'Incorta Nexus';

interface CopilotChatWindowProps {
  children?: any;
  overlayed?: boolean;
  visible?: boolean;
  isLoading?: boolean;
  isPanelExpanded?: boolean;
  searchPlaceholder?: string;
  allowStopAnswerGeneration?: boolean;
  searchPopover?: {
    container: React.ReactNode;
    handler: {
      onClick: () => void;
    };
  };
  hideExpand?: boolean;
  schemaContext?: {
    schemaType: string;
    onlyVerified?: boolean;
  };
  contextSwitchOptions?: ContextSwitchOptions;
  onClose: () => void;
}

export type SchemaContextOption = {
  alertText?: string;
  usedSchemaInAnswer?: string;
  usedBusinessViewInAnswer?: string;
};

const CopilotChatWindow = ({
  overlayed = true,
  children,
  visible,
  isLoading,
  isPanelExpanded,
  searchPlaceholder,
  allowStopAnswerGeneration,
  searchPopover,
  hideExpand,
  schemaContext,
  contextSwitchOptions,
  onClose,
  ...props
}: CopilotChatWindowProps & DrawerProps) => {
  const { 
    messages, 
    sendMessage, 
    clearMessages, 
    isConnected, 
    isThinking,
    isAuthenticated 
  } = useChat();
  
  const [searchValue, setSearchValue] = useState('');
  const [showSchemaSelectionPanel, setShowSchemaSelectionPanel] = useState<
    boolean | SchemaContextOption
  >(false);
  
  // Mock state for schema selection - in real app this would come from Redux
  const [isSchemaSelected, setIsSchemaSelected] = useState(false);
  const [chatSettings, setChatSettings] = useState({
    enable_summary: true,
    verbosity: 'detailed' as 'detailed' | 'brief'
  });

  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    // show schema selection panel if no schema is selected on startup
    if (!isSchemaSelected && schemaContext) {
      setShowSchemaSelectionPanel(true);
    } else {
      setShowSchemaSelectionPanel(false);
    }
  }, [isSchemaSelected, schemaContext]);

  const resetState = () => {
    setSearchValue('');
    clearMessages();
  };

  const SchemaSelectionIcon = () => (
    <DatabaseOutlined
      className={classNames({
        'inc-copilot__schema-selection-panel-open-btn-disabled': isLoading,
        'inc-copilot__schema-selection-panel-open-selected-schema': isSchemaSelected
      })}
      data-testid="inc-copilot__schema-selection-panel-open-btn"
      onClick={() => {
        if (!isLoading) {
          setShowSchemaSelectionPanel(true);
        }
      }}
      title="Browse Schemas"
      disabled={isLoading}
    />
  );

  const isRTL = document.dir === 'rtl';

  return (
    <Drawer
      placement={isRTL ? 'left' : 'right'}
      className={classNames('inc-copilot-drawer', {
        'inc-copilot-drawer--mobile': isMobile,
        'inc-copilot-drawer--expanded': isPanelExpanded,
        'inc-copilot-drawer--open': visible,
        'inc-copilot-drawer--embeded': !overlayed
      })}
      title={
        <div className="inc-copilot-drawer__title">
          <span>{INCORTA_COPILOT}</span>
        </div>
      }
      open={visible}
      closable={false}
      onClose={onClose}
      getContainer={overlayed ? () => document.body : false}
      extra={
        <div className="inc-copilot-drawer__header__actions">
          <Popconfirm
            overlayClassName="inc-copilot__reset-btn-popconfirm"
            placement="bottom"
            title={
              <div>
                <div className="inc-copilot__reset-btn-popconfirm_title">
                  <FormattedMessage id="dashboard.ai.actions.clear_chat_history.title" defaultMessage="Clear Chat History" />
                </div>
                <div className="inc-copilot__reset-btn-popconfirm_subtitle">
                  <FormattedMessage id="dashboard.ai.actions.clear_chat_history.description" defaultMessage="This will clear all messages in the current conversation." />
                </div>
              </div>
            }
            onConfirm={() => {
              resetState();
            }}
            okText="Clear"
            cancelText="Cancel"
          >
            <UndoOutlined
              data-testid="inc-copilot__reset-btn"
              title="Reset Conversation"
            />
          </Popconfirm>
          <Popover
            arrowPointAtCenter={false}
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
            <SettingOutlined />
          </Popover>
          {schemaContext && (
            <Tooltip
              title={
                isLoading &&
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
          )}

          {!isMobile && !hideExpand ? (
            <ChatLayoutToggleButton isPanelExpanded={!!isPanelExpanded} />
          ) : null}

          {!hideExpand && (
            <CloseOutlined
              data-testid="inc-copilot__panel-close-btn"
              title="Close"
              onClick={onClose}
            />
          )}
        </div>
      }
      footer={
        <ChatSearchSection
          isLoading={isLoading || isThinking}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          addUserMessage={(newMessage: string, messageColor?: string) => {
            sendMessage(newMessage);
          }}
          searchPlaceholder={searchPlaceholder}
          onClearChatContext={clearMessages}
          allowStopAnswerGeneration={allowStopAnswerGeneration}
          searchPopover={searchPopover}
          openSchemaSelectionDialog={(options: any) =>
            setShowSchemaSelectionPanel(options)
          }
          contextSwitchOptions={contextSwitchOptions}
        />
      }
      {...props}
    >
      <div className="inc-augmented-analytics-dialog-content">
        <ChatIntro />
        <ChatContainer
          messages={messages.filter(message => !message.type.includes('error'))}
          generateAnswer={(params: any) => sendMessage(params.question)}
          openSchemaSelectionDialog={context =>
            setShowSchemaSelectionPanel(context as SchemaContextOption)
          }
        />
        {showSchemaSelectionPanel ? (
          <SchemaContextSelection
            setShowSchemaSelectionPanel={setShowSchemaSelectionPanel}
            schemaContext={schemaContext}
            options={showSchemaSelectionPanel as SchemaContextOption}
            onSchemaSelect={(schemaName: string, viewName: string) => {
              setIsSchemaSelected(true);
              setShowSchemaSelectionPanel(false);
            }}
          />
        ) : null}
        {children}
      </div>
    </Drawer>
  );
};

export default CopilotChatWindow;