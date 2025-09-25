import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, AlertCircle, Loader2, FileText, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { ChatMessage } from '@/contexts/ChatContext';
import ToolResultDisplay from './ToolResultDisplay';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  // console.log('MessageBubble rendered - type:', message.type, 'content preview:', message.content?.substring(0, 50));

  const getMessageConfig = () => {
    switch (message.type) {
      case 'user':
        return {
          icon: User,
          bgClass: 'bg-primary text-primary-foreground ml-auto',
          iconBg: 'bg-primary-foreground/20',
          align: 'right'
        };
      case 'assistant':
        return {
          icon: Bot,
          bgClass: 'bg-card border border-border',
          iconBg: 'bg-primary/10 text-primary',
          align: 'left',
          useCustomIcon: true
        };
      case 'thinking':
        return {
          icon: Loader2,
          bgClass: 'bg-muted/50 border border-border',
          iconBg: 'bg-blue-500/10 text-blue-600',
          align: 'left',
          animate: true,
          useCustomIcon: true
        };
      case 'files_uploaded':
        return {
          icon: Upload,
          bgClass: 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800',
          iconBg: 'bg-green-500/10 text-green-600',
          align: 'left'
        };
      case 'tool_result':
        return {
          icon: Bot,
          bgClass: 'bg-card border border-border',
          iconBg: 'bg-blue-500/10 text-blue-600',
          align: 'left',
          useCustomIcon: true
        };
      case 'tool_call':
        return {
          icon: Bot,
          bgClass: 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800',
          iconBg: 'bg-blue-500/10 text-blue-600',
          align: 'left',
          useCustomIcon: true
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgClass: 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800',
          iconBg: 'bg-red-500/10 text-red-600',
          align: 'left'
        };
      default:
        return {
          icon: Bot,
          bgClass: 'bg-card border border-border',
          iconBg: 'bg-muted',
          align: 'left'
        };
    }
  };

  const config = getMessageConfig();
  const Icon = config.icon;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessageContent = () => {
    // console.log('=== MESSAGE BUBBLE DEBUG ===');
    // console.log('Message type:', message.type);
    // console.log('Full message:', message);
    // console.log('===============================');
    
    switch (message.type) {
      case 'thinking':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="italic">{message.content}</span>
          </div>
        );
      case 'tool_call':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">
                Executing tool: {message.toolName || 'Unknown tool'}
              </span>
            </div>
            {message.toolArgs && Object.keys(message.toolArgs).length > 0 ? (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Parameters:</div>
                <pre className="text-xs text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                  {JSON.stringify(message.toolArgs, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-700 dark:text-blue-300">No parameters</div>
              </div>
            )}
          </div>
        );
      case 'tool_result':
        return <ToolResultDisplay message={message} />;
      case 'assistant':
        // Handle empty content gracefully
        if (!message.content || message.content.trim() === '') {
          return (
            <div className="flex items-center gap-2 text-muted-foreground italic">
              <span>Processing your request...</span>
            </div>
          );
        }
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-muted prose-pre:border prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
            <ReactMarkdown 
              rehypePlugins={[rehypeHighlight]}
              components={{
                // Custom rendering for code blocks with syntax highlighting
                pre: ({ children }) => (
                  <pre className="bg-gray-900 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm border border-gray-200 dark:border-gray-700">
                    {children}
                  </pre>
                ),
                // Custom rendering for inline code
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-primary">
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                // Better table styling
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-border border border-border rounded-lg">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/50">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2 font-semibold text-left text-foreground border-b border-border">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 border-b border-border text-foreground">
                    {children}
                  </td>
                ),
                // Better blockquote styling
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/20 rounded-r-lg my-4 italic">
                    {children}
                  </blockquote>
                ),
                // Better list styling
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 my-3">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 my-3">
                    {children}
                  </ol>
                ),
                // Better heading styling
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold mb-3 mt-4 text-foreground">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold mb-2 mt-3 text-foreground">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-medium mb-2 mt-3 text-foreground">
                    {children}
                  </h3>
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        );
      case 'user':
        return (
          <div className="space-y-2">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.files && message.files.length > 0 && (
              <div className="mt-3 pt-3 border-t border-primary-foreground/20">
                <div className="text-xs opacity-80 mb-2">Attached files:</div>
                <div className="space-y-1">
                  {message.files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs opacity-90">
                      <FileText className="h-3 w-3" />
                      <span>{file.name}</span>
                      <span className="opacity-70">({formatFileSize(file.size)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-muted prose-pre:border prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        );
    }
  };

  return (
    <div className={`flex gap-3 ${config.align === 'right' ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.iconBg}`}>
        {config.useCustomIcon && (message.type === 'assistant' || message.type === 'thinking' || message.type === 'tool_call' || message.type === 'tool_result') ? (
          <div className="relative">
            <img 
              src="/copilot-icon.svg" 
              alt="Copilot" 
              className="h-5 w-5"
            />
            {message.type === 'thinking' && (
              <Loader2 className="h-3 w-3 animate-spin absolute -top-1 -right-1 text-blue-600" />
            )}
            {message.type === 'tool_call' && (
              <Loader2 className="h-3 w-3 animate-spin absolute -top-1 -right-1 text-blue-600" />
            )}
          </div>
        ) : (
          <Icon className={`h-4 w-4 ${config.animate ? 'animate-spin' : ''}`} />
        )}
      </div>
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`max-w-3xl rounded-2xl px-4 py-3 ${config.bgClass}`}
      >
        {renderMessageContent()}
        
        <div className={`text-xs mt-2 opacity-60 ${config.align === 'right' ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </motion.div>
    </div>
  );
};

export default MessageBubble;