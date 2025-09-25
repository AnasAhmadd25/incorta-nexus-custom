import React from 'react';
import { motion } from 'framer-motion';
import { useChat } from '@/contexts/ChatContext';
import MessageBubble from './MessageBubble';
import ThinkingIndicator from './ThinkingIndicator';
import ToolExecutionTab from './ToolExecutionTab';
import { useToolExecutions } from '@/hooks/useToolExecutions';

const MessageList: React.FC = () => {
  const { messages, isThinking } = useChat();
  const toolExecutions = useToolExecutions(messages);

  console.log('MessageList: Received', messages.length, 'messages');
  console.log('MessageList: Message types:', messages.map(m => m.type));
  console.log('MessageList: Tool executions:', toolExecutions.length);

  // Filter out individual tool call and tool result messages since we'll show them in tabs
  const displayMessages = messages.filter(message => 
    message.type !== 'tool_call' && message.type !== 'tool_result'
  );

  console.log('MessageList: After filtering,', displayMessages.length, 'display messages');

  let messageIndex = 0;
  let toolIndex = 0;

  // Create a combined list of messages and tool executions in chronological order
  const combinedItems: Array<{ type: 'message' | 'tool'; data: any; timestamp: number }> = [];

  // Add messages
  displayMessages.forEach(message => {
    combinedItems.push({
      type: 'message',
      data: message,
      timestamp: message.timestamp
    });
  });

  // Add tool executions
  toolExecutions.forEach(toolExecution => {
    combinedItems.push({
      type: 'tool',
      data: toolExecution,
      timestamp: toolExecution.toolCall.timestamp
    });
  });

  // Sort by timestamp
  combinedItems.sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="space-y-6">
      {combinedItems.map((item, index) => (
        <motion.div
          key={item.type === 'message' ? item.data.id : item.data.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          {item.type === 'message' ? (
            <MessageBubble message={item.data} />
          ) : (
            <ToolExecutionTab 
              toolCall={item.data.toolCall} 
              toolResult={item.data.toolResult}
            />
          )}
        </motion.div>
      ))}
      
      {isThinking && <ThinkingIndicator />}
    </div>
  );
};

export default MessageList;