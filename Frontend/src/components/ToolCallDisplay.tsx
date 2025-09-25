import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { ChatMessage } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';

interface ToolCallDisplayProps {
  message: ChatMessage;
}

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-blue-900 dark:text-blue-100">
          Executing: {message.toolName}
        </span>
      </div>
      
      {message.toolArgs && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            {isExpanded ? 'Hide' : 'Show'} parameters
          </Button>
          
          {isExpanded && (
            <div className="bg-muted/30 rounded-lg p-3 text-xs">
              <pre className="whitespace-pre-wrap text-muted-foreground">
                {JSON.stringify(message.toolArgs, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolCallDisplay;