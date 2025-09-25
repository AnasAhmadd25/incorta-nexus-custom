import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/contexts/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';

const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage: chatSendMessage, isThinking, isConnected, isAuthenticated } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && selectedFiles.length === 0) || isThinking || !isConnected || !isAuthenticated) return;

    const currentMessage = message.trim();
    const currentFiles = [...selectedFiles];
    
    setMessage('');
    setSelectedFiles([]);
    
    if (currentFiles.length > 0) {
      await handleFileUpload(currentFiles, currentMessage);
    } else {
      await chatSendMessage(currentMessage);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileUpload = async (files: File[], message?: string) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      await chatSendMessage(message || '', files);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      txt: '📄',
      csv: '📊',
      xlsx: '📊',
      xls: '📊',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️'
    };
    return iconMap[extension || ''] || '📎';
  };

  const getPlaceholder = () => {
    if (!isConnected) return "Connecting to server...";
    if (!isAuthenticated) return "Please authenticate first...";
    if (isThinking) return "Copilot is processing...";
    if (selectedFiles.length > 0) return "Add a message about these files...";
    return "Ask Incorta Nexus...";
  };

  const isDisabled = !isConnected || !isAuthenticated || isUploading;

  return (
    <div className="space-y-3 max-w-4xl mx-auto px-4">
      {/* File Preview */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-accent/50 border border-border rounded-lg p-3 space-y-2"
          >
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(file)}</span>
                  <div>
                    <div className="font-medium text-sm text-foreground">
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Upload Progress */}
            {isUploading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="relative">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="pr-20 min-h-[48px] max-h-32 resize-none rounded-lg border-2 focus:border-primary bg-white dark:bg-gray-800 shadow-sm"
              rows={1}
              disabled={isDisabled}
              maxLength={2000}
            />
            <div className="absolute right-3 bottom-3 flex items-center space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFileSelect}
                disabled={isDisabled}
                className="h-8 w-8 p-0 hover:bg-accent rounded-md"
                title="Upload file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                disabled={(!message.trim() && selectedFiles.length === 0) || isThinking || isDisabled}
                size="sm"
                className="h-8 w-8 p-0 rounded-md"
                title="Send message"
              >
                {isThinking || isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.json,.xml"
          className="hidden"
          multiple
        />
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
        <span>
          {!isConnected ? (
            "Connecting..."
          ) : !isAuthenticated ? (
            "Please authenticate to start chatting"
          ) : isThinking ? (
            "Copilot is thinking..."
          ) : (
            "Press Enter to send"
          )}
        </span>
        <span className="text-muted-foreground/60">{message.length}/2000</span>
      </div>
    </div>
  );
};

export default ChatInput;