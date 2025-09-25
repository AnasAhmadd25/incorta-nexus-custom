import { useMemo } from 'react';
import { ChatMessage } from '@/contexts/ChatContext';

export interface ToolExecution {
  id: string;
  toolCall: ChatMessage;
  toolResult?: ChatMessage;
  isCompleted: boolean;
}

export const useToolExecutions = (messages: ChatMessage[]): ToolExecution[] => {
  return useMemo(() => {
    const toolExecutions: ToolExecution[] = [];
    const pendingTools = new Map<string, ChatMessage>();

    messages.forEach(message => {
      if (message.type === 'tool_call' && message.toolId) {
        // Add new tool call
        pendingTools.set(message.toolId, message);
        toolExecutions.push({
          id: message.toolId,
          toolCall: message,
          isCompleted: false
        });
      } else if (message.type === 'tool_result' && message.toolId) {
        // Find and complete the corresponding tool execution
        const executionIndex = toolExecutions.findIndex(exec => exec.id === message.toolId);
        if (executionIndex !== -1) {
          toolExecutions[executionIndex] = {
            ...toolExecutions[executionIndex],
            toolResult: message,
            isCompleted: true
          };
        }
        pendingTools.delete(message.toolId);
      }
    });

    return toolExecutions;
  }, [messages]);
};

export default useToolExecutions;
