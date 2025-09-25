import React, { useCallback } from 'react';
import { ChatMessage } from '@/contexts/ChatContext';
import ChatPrompt from '../ChatPrompt/ChatPrompt';
import './ChatContainer.less';

const SPECIAL_MESSAGES_TYPES = ['clear_context'];

type ChatContainerProps = {
  messages: ChatMessage[];
  generateAnswer?: ({
    question,
    schemaName,
    viewName
  }: {
    question: string;
    schemaName?: string;
    viewName?: string;
  }) => void;
  openSchemaSelectionDialog: (options?: any) => void;
};

const ChatContainer = ({
  messages,
  generateAnswer = () => {},
  openSchemaSelectionDialog
}: ChatContainerProps) => {
  const isSpecialMsgType = useCallback(
    (message: ChatMessage) => SPECIAL_MESSAGES_TYPES.includes(message.type),
    []
  );

  const isLastOfType = useCallback(
    (message: ChatMessage, nextMessage?: ChatMessage) => {
      return (
        !isSpecialMsgType(message) &&
        (message.type !== nextMessage?.type || (nextMessage && isSpecialMsgType(nextMessage)))
      );
    },
    [isSpecialMsgType]
  );

  return (
    <div className="inc-augmented-analytics-chat">
      {messages.map((message, index) => {
        return (
          <ChatPrompt
            key={message.id}
            message={message}
            generateAnswer={generateAnswer}
            openSchemaSelectionDialog={openSchemaSelectionDialog}
            lastOfType={isLastOfType(message, messages?.[index + 1])}
          />
        );
      })}
    </div>
  );
};

export default ChatContainer;