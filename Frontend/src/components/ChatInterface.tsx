import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '@/contexts/ChatContext';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ConnectionStatus from './ConnectionStatus';
import AuthForm from './AuthForm';

const ChatInterface: React.FC = () => {
  const { messages, isAuthenticated } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show authentication form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <ChatHeader />
        <ConnectionStatus />
        <div className="flex-1 flex items-center justify-center p-4">
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      <ConnectionStatus />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center py-20"
              >
                <div className="mb-8">
                  <img
                    src="/copilot-icon.svg"
                    alt="Copilot"
                    style={{ 
                      width: '120px', 
                      height: '120px', 
                      margin: '0 auto 40px',
                      display: 'block'
                    }}
                  />
                  <h1 className="text-3xl font-bold text-foreground mb-4">
                    Hi there! I am Incorta Nexus. How can I help you today?
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl">
                    Your intelligent copilot powered by advanced AI and tool integration. 
                    Ask questions, analyze data, upload files, and get insights with real-time tool execution.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                    <h3 className="font-semibold text-card-foreground mb-2">Data Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Analyze your data with powerful AI-driven insights
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                    <h3 className="font-semibold text-card-foreground mb-2">File Upload</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload documents, spreadsheets, and images for analysis
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                    <h3 className="font-semibold text-card-foreground mb-2">Tool Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Execute tools and functions in real-time
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                    <h3 className="font-semibold text-card-foreground mb-2">Real-time Updates</h3>
                    <p className="text-sm text-muted-foreground">
                      See live updates as tools are executed
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <MessageList />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <div className="border-t border-border bg-background">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <ChatInput />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;