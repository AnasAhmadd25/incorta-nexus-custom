import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import config from '@/config';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'thinking' | 'error' | 'file_processed' | 'files_uploaded';
  content: string;
  timestamp: number;
  toolName?: string;
  toolArgs?: any;
  toolId?: string;
  result?: any;
  files?: File[];
}

export interface UploadedFile {
  name: string;
  content: string; // base64 encoded
  size: number;
  type: string;
}

export interface AuthCredentials {
  envUrl: string;
  tenant: string;
  accessToken: string;
  sqlxHost: string;
  incortaUsername: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  isConnected: boolean;
  isThinking: boolean;
  isAuthenticated: boolean;
  currentModel: string;
  sendMessage: (message: string, files?: File[]) => void;
  sendFiles: (files: File[]) => void;
  authenticate: (credentials: AuthCredentials) => void;
  switchModel: (model: string) => Promise<void>;
  clearMessages: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('claude');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    // Use config for WebSocket URL
    const wsUrl = config.websocket.url;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionStatus('connected');
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data.type, data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setIsThinking(false);
      wsRef.current = null;
      
      // Attempt to reconnect after configured delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, config.websocket.reconnectDelay);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
      setIsThinking(false);
    };
  };

  const handleWebSocketMessage = (data: any) => {
    const messageId = `${Date.now()}-${Math.random()}`;

    switch (data.type) {
      case 'connected':
        console.log('Chat service ready');
        break;

      case 'authenticated':
        setIsAuthenticated(true);
        // Update current model if provided
        if (data.data?.model) {
          setCurrentModel(data.data.model);
        }
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'assistant',
          content: 'Successfully authenticated! You can now start chatting and uploading files.',
          timestamp: Date.now()
        }]);
        break;

      case 'model_switched':
        console.log('ChatContext received model_switched:', data);
        console.log('Setting currentModel to:', data.data.model);
        setCurrentModel(data.data.model);
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'assistant',
          content: `Successfully switched to ${data.data.model}`,
          timestamp: Date.now()
        }]);
        break;

      case 'model_switch_failed':
        console.log('ChatContext received model_switch_failed:', data);
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'error',
          content: `Failed to switch model: ${data.data?.message || 'Unknown error'}`,
          timestamp: Date.now()
        }]);
        break;

      case 'authentication_failed':
        setIsAuthenticated(false);
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'error',
          content: `Authentication failed: ${data.data?.message || 'Unknown error'}`,
          timestamp: Date.now()
        }]);
        break;

      case 'user_message':
        // Don't add user messages from server since we already added them locally
        // This prevents duplicate user messages in the UI
        console.log('Received user message confirmation from server:', data.data.content);
        break;

      case 'assistant_message':
        setIsThinking(false);
        console.log('ChatContext: Adding assistant message:', data.data.content.substring(0, 100));
        setMessages(prev => {
          // Check if the last message is an assistant message that we can update
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.type === 'assistant' && lastMessage.id.includes('assistant-temp')) {
            // Update the existing assistant message
            const updatedMessages = [...prev];
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content: data.data.content,
              timestamp: Date.now()
            };
            console.log('ChatContext: Updated assistant message, total:', updatedMessages.length);
            return updatedMessages;
          } else {
            // Create new assistant message
            const newMessages = [...prev, {
              id: `assistant-temp-${Date.now()}`,
              type: 'assistant' as const,
              content: data.data.content,
              timestamp: Date.now()
            }];
            console.log('ChatContext: Total messages after assistant:', newMessages.length);
            return newMessages;
          }
        });
        break;

      case 'thinking':
        setIsThinking(true);
        // Don't add thinking messages to the chat - just update the thinking state
        break;

      case 'tool_call':
        console.log('ChatContext: Adding tool_call message:', data.data.tool_name);
        setMessages(prev => {
          const newMessages = [...prev, {
            id: messageId,
            type: 'tool_call' as const,
            content: `Calling tool: ${data.data.tool_name}`,
            timestamp: Date.now(),
            toolName: data.data.tool_name,
            toolArgs: data.data.tool_args,
            toolId: data.data.tool_id
          }];
          console.log('ChatContext: Total messages after tool_call:', newMessages.length);
          return newMessages;
        });
        break;

      case 'tool_result':
        console.log('ChatContext: Adding tool_result message:', data.data.tool_name);
        setMessages(prev => {
          const newMessages = [...prev, {
            id: messageId,
            type: 'tool_result' as const,
            content: `Tool result from ${data.data.tool_name}`,
            timestamp: Date.now(),
            toolName: data.data.tool_name,
            toolId: data.data.tool_id,
            result: data.data.result
          }];
          console.log('ChatContext: Total messages after tool_result:', newMessages.length);
          console.log('ChatContext: Tool result data:', data.data.result);
          return newMessages;
        });
        // Stop thinking after tool result - in case no assistant message follows
        setTimeout(() => setIsThinking(false), 1000);
        break;

      case 'file_processed':
        // Don't show individual file processing messages to keep chat clean
        break;

      case 'files_uploaded':
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'files_uploaded',
          content: data.data.message,
          timestamp: Date.now()
        }]);
        break;

      case 'file_error':
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'error',
          content: `Error processing file "${data.data.file_name}": ${data.data.error}`,
          timestamp: Date.now()
        }]);
        break;

      case 'completed':
        setIsThinking(false);
        break;

      case 'error':
        setIsThinking(false);
        setMessages(prev => [...prev, {
          id: messageId,
          type: 'error',
          content: data.data.message || 'An error occurred',
          timestamp: Date.now()
        }]);
        break;
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:type/subtype;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const authenticate = (credentials: AuthCredentials) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'authenticate',
      credentials: credentials
    }));
  };

  const sendMessage = async (message: string, files?: File[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    if (!isAuthenticated) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        content: 'Please authenticate first before sending messages',
        timestamp: Date.now()
      }]);
      return;
    }

    // Add user message immediately (show clean message without file content)
    const userMessageId = `user-${Date.now()}`;
    const displayMessage = files && files.length > 0 
      ? `${message} [Files: ${files.map(f => f.name).join(', ')}]`
      : message;
      
    // Only add user message to UI, don't duplicate when receiving from server
    setMessages(prev => [...prev, {
      id: userMessageId,
      type: 'user',
      content: displayMessage,
      timestamp: Date.now(),
      files: files
    }]);

    try {
      let fileData: UploadedFile[] = [];
      
      if (files && files.length > 0) {
        // Convert files to base64
        fileData = await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            content: await fileToBase64(file),
            size: file.size,
            type: file.type
          }))
        );
      }

      // Send to backend
      wsRef.current.send(JSON.stringify({
        type: 'query',
        query: message,
        files: fileData
      }));
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Error processing files: ${error}`,
        timestamp: Date.now()
      }]);
    }
  };

  const sendFiles = async (files: File[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    if (!isAuthenticated) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        content: 'Please authenticate first before uploading files',
        timestamp: Date.now()
      }]);
      return;
    }

    try {
      // Convert files to base64
      const fileData: UploadedFile[] = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          content: await fileToBase64(file),
          size: file.size,
          type: file.type
        }))
      );

      // Add user message for file upload (clean message)
      const userMessageId = `user-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: userMessageId,
        type: 'user',
        content: `Uploaded ${files.length} file(s): ${files.map(f => f.name).join(', ')}`,
        timestamp: Date.now(),
        files: files
      }]);

      // Send to backend
      wsRef.current.send(JSON.stringify({
        type: 'upload_files',
        files: fileData
      }));
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Error uploading files: ${error}`,
        timestamp: Date.now()
      }]);
    }
  };

  const switchModel = async (model: string): Promise<void> => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    if (!isAuthenticated) {
      throw new Error('Please authenticate first before switching models');
    }

    console.log('ChatContext switchModel - sending set_model request for:', model);

    // Send model switch request
    wsRef.current.send(JSON.stringify({
      type: 'set_model',
      model: model
    }));

    // Return a resolved promise since we'll handle the response through normal message flow
    return Promise.resolve();
  };

  const clearMessages = () => {
    setMessages([]);
    setIsThinking(false);
    
    // Send clear conversation command to backend
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'clear_conversation'
      }));
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <ChatContext.Provider value={{
      messages,
      isConnected,
      isThinking,
      isAuthenticated,
      currentModel,
      sendMessage,
      sendFiles,
      authenticate,
      switchModel,
      clearMessages,
      connectionStatus
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};