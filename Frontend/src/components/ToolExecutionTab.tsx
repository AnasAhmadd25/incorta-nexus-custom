import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, CheckCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/contexts/ChatContext';
import ToolResultDisplay from './ToolResultDisplay';

interface ToolExecutionTabProps {
  toolCall: ChatMessage;
  toolResult?: ChatMessage;
}

const ToolExecutionTab: React.FC<ToolExecutionTabProps> = ({ toolCall, toolResult }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isCompleted = !!toolResult;
  const isLoading = !isCompleted;

  const formatToolArgs = (args: any) => {
    if (!args) return 'No arguments';
    
    if (typeof args === 'object') {
      return JSON.stringify(args, null, 2);
    }
    
    return String(args);
  };

  console.log('ToolExecutionTab - toolResult:', toolResult);
  console.log('ToolExecutionTab - toolResult.result:', toolResult?.result);

  if (toolResult) {
    console.log('About to render ToolResultDisplay with toolResult:', toolResult);
  }

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-600">
        <Settings className="h-4 w-4" />
      </div>
      
      <div className="max-w-3xl flex-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`
            border rounded-2xl overflow-hidden transition-all duration-200
            ${isCompleted 
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' 
              : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
            }
          `}
        >
          <Button
            variant="ghost"
            className={`
              w-full justify-between p-3 h-auto rounded-none hover:bg-transparent
              ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}
            `}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span className="font-medium">
                {isLoading ? 'Executing' : 'Executed'} tool: {toolCall?.toolName || 'Unknown Tool'}
              </span>
              {isLoading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="ml-2"
                >
                  <div className="w-2 h-2 bg-current rounded-full opacity-60" />
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isCompleted && (
                <span className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                  Completed
                </span>
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </Button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-current/20"
              >
                <div className="p-4 space-y-3">
                  {/* Tool Arguments */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-current">Arguments:</h4>
                    <div className="bg-slate-50 dark:bg-slate-900 border rounded p-3 text-sm font-mono overflow-x-auto">
                      <pre className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{formatToolArgs(toolCall?.toolArgs)}</pre>
                    </div>
                  </div>

                  {/* Tool Result */}
                  {toolResult && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-current">Result:</h4>
                      <div className="border rounded overflow-hidden">
                        <ToolResultDisplay message={toolResult} />
                      </div>
                    </div>
                  )}

                  {/* Execution Time */}
                  {toolResult && (
                    <div className="text-xs text-current/70 flex justify-between">
                      <span>Started: {new Date(toolCall?.timestamp || Date.now()).toLocaleTimeString()}</span>
                      <span>Completed: {new Date(toolResult?.timestamp || Date.now()).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Timestamp */}
        <div className="text-xs mt-2 opacity-60">
          {new Date(toolCall?.timestamp || Date.now()).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ToolExecutionTab;
