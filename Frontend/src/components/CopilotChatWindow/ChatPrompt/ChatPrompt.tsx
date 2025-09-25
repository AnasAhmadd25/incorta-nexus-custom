import { FC, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { ChatMessage } from '@/contexts/ChatContext';
import ToolResultDisplay from '../../ToolResultDisplay';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import { Button, Space } from 'antd';
import { FormattedMessage } from 'react-intl';
import './ChatPrompt.less';
import { INCORTA_COPILOT } from '../CopilotChatWindow';

type ChatPromptProps = {
  message: ChatMessage;
  generateAnswer: Function;
  openSchemaSelectionDialog: (options?: any) => void;
  lastOfType?: boolean;
};

const ChatPrompt = ({
  message,
  generateAnswer,
  openSchemaSelectionDialog,
  lastOfType
}: ChatPromptProps) => {
  const chatMessageRef = useRef<HTMLDivElement>(null);
  const [showMoreRelated, setShowMoreRelated] = useState(false);
  
  const isMobile = window.innerWidth <= 768;
  const isPendingAnsweringQuestion = false; // This would come from context/state
  const isPanelExpanded = false; // This would come from context/state

  useEffect(() => {
    if (chatMessageRef.current) {
      setTimeout(
        () => chatMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        100
      );
    }
  }, [message]);

  const getCopilotAnswerComponent = (message: ChatMessage) => {
    console.log('ChatPrompt: Rendering message type:', message.type, 'content preview:', message.content?.substring(0, 50));
    
    switch (message.type) {
      case 'assistant':
        console.log('ChatPrompt: Rendering assistant message with markdown:', message.content.substring(0, 200));
        return (
          <div className="assistant-message">
            <div className="message-content prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown 
                rehypePlugins={[rehypeHighlight]}
                components={{
                  // Custom rendering for headers
                  h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-bold mb-3 text-foreground">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-semibold mb-2 text-foreground">{children}</h3>,
                  // Custom rendering for paragraphs
                  p: ({children}) => <p className="mb-3 text-foreground leading-relaxed">{children}</p>,
                  // Custom rendering for lists
                  ul: ({children}) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
                  li: ({children}) => <li className="text-foreground">{children}</li>,
                  // Custom rendering for strong/bold text
                  strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                  // Custom rendering for code blocks
                  pre: ({ children }) => (
                    <pre className="bg-muted border rounded p-3 overflow-x-auto mb-3">
                      {children}
                    </pre>
                  ),
                  code: ({ className, children, ...props }) => {
                    return (
                      <code className={`bg-muted px-1 py-0.5 rounded text-sm ${className || ''}`} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        );

      case 'tool_call':
        return (
          <div className="tool-call-message">
            <div className="tool-call-header">
              <LoadingOutlined spin />
              <span>Executing tool: {message.toolName}</span>
            </div>
            {message.toolArgs && (
              <div className="tool-args">
                <pre>{JSON.stringify(message.toolArgs, null, 2)}</pre>
              </div>
            )}
          </div>
        );

      case 'tool_result':
        return (
          <div className="tool-result-message">
            <ToolResultDisplay message={message} />
          </div>
        );

      case 'error':
        return (
          <div className="error-message">
            <div className="error-content">{message.content}</div>
          </div>
        );

      case 'files_uploaded':
        return (
          <div className="files-uploaded-message">
            <div className="files-uploaded-content">{message.content}</div>
          </div>
        );

      default:
        return <div className="default-message">{message.content}</div>;
    }
  };

  return (
    <div className={classNames('inc-augmented-analytics-chat-prompt', { 'chat-mobile': isMobile })}>
      <div
        ref={chatMessageRef}
        className={classNames(
          `inc-augmented-analytics-chat-prompt__content ${message.type}-content`,
          {
            'last-of-type': lastOfType,
            mobile: isMobile
          }
        )}
      >
        {message.type === 'user' ? (
          <UserQuestion message={message} />
        ) : (
          <CopilotAnswer
            isLoading={false}
            isMobile={isMobile}
          >
            {getCopilotAnswerComponent(message)}
          </CopilotAnswer>
        )}
      </div>
    </div>
  );
};

const UserQuestion: FC<{ message: ChatMessage }> = ({ message }) => {
  const isRTL = document.dir === 'rtl';

  return (
    <div
      className={classNames('inc-copilot__user-question', {
        rtl: isRTL
      })}
    >
      <div>
        {message.content}
        {message.files && message.files.length > 0 && (
          <div className="attached-files">
            Files: {message.files.map(f => f.name).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};

type CopilotAnswerProps = {
  isLoading?: boolean;
  isMobile?: boolean;
  children: React.ReactNode;
};

const CopilotAnswer: FC<CopilotAnswerProps> = ({ children, isLoading, isMobile }) => {
  const isRTL = document.dir === 'rtl';

  return (
    <>
      <div
        className={classNames('inc-copilot__answer', {
          'inc-copilot__answer--loading': isLoading
        })}
      >
        <div className="inc-copilot__answer__icon">
          <img src="/copilot-icon.svg" alt="incorta nexus logo" />
          {isMobile ? <p>{INCORTA_COPILOT}</p> : null}
        </div>
        <div
          className={classNames('inc-copilot__answer__content', {
            rtl: isRTL
          })}
        >
          {isLoading ? (
            <div>
              <div className="inc-copilot__answer__content__loading">
                <div className="snippet" data-title="dot-flashing">
                  <div className="stage">
                    <div className="dot-flashing"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </>
  );
};

export default ChatPrompt;