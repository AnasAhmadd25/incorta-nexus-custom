import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Copy, Database, Table, Eye } from 'lucide-react';
import { ChatMessage } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ToolResultDisplayProps {
  message: ChatMessage;
}

const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded so users can see the result
  const [copySuccess, setCopySuccess] = useState(false);

  const parseAndFormat = useMemo(() => {
    if (!message.result) return null;

    console.log('Tool result raw data:', message.result);
    console.log('Tool result type:', typeof message.result);

    try {
      // Handle array of JSON strings (like your example)
      if (Array.isArray(message.result) && message.result.length > 0) {
        const firstItem = message.result[0];
        console.log('First array item:', firstItem);
        
        if (typeof firstItem === 'string') {
          try {
            const parsed = JSON.parse(firstItem);
            console.log('Parsed JSON from string:', parsed);
            return {
              type: 'json',
              data: parsed,
              raw: firstItem,
              formatted: JSON.stringify(parsed, null, 2)
            };
          } catch (e) {
            console.log('Failed to parse JSON from string:', e);
            return {
              type: 'text',
              data: message.result,
              formatted: Array.isArray(message.result) ? message.result.join('\n') : String(message.result)
            };
          }
        }
      }

      // Handle direct objects
      if (typeof message.result === 'object') {
        console.log('Direct object result:', message.result);
        return {
          type: 'json',
          data: message.result,
          formatted: JSON.stringify(message.result, null, 2)
        };
      }

      // Handle strings that might be JSON
      if (typeof message.result === 'string') {
        console.log('String result, attempting to parse:', message.result.substring(0, 100));
        try {
          const parsed = JSON.parse(message.result);
          console.log('Parsed JSON from direct string:', parsed);
          return {
            type: 'json',
            data: parsed,
            raw: message.result,
            formatted: JSON.stringify(parsed, null, 2)
          };
        } catch (e) {
          console.log('Failed to parse direct string as JSON:', e);
          return {
            type: 'text',
            data: message.result,
            formatted: String(message.result)
          };
        }
      }

      return {
        type: 'text',
        data: message.result,
        formatted: String(message.result)
      };
    } catch (error) {
      console.error('Error in parseAndFormat:', error);
      return {
        type: 'error',
        data: message.result,
        formatted: 'Error parsing result',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [message.result]);

  const handleCopy = async () => {
    if (parseAndFormat?.formatted) {
      try {
        await navigator.clipboard.writeText(parseAndFormat.formatted);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const getToolIcon = (toolName?: string) => {
    if (!toolName) return CheckCircle;
    
    if (toolName.includes('schema')) return Database;
    if (toolName.includes('table') || toolName.includes('data')) return Table;
    return Eye;
  };

  const renderFormattedData = () => {
    if (!parseAndFormat) {
      console.log('No parseAndFormat data');
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          No data to display
        </div>
      );
    }

    console.log('Rendering with parseAndFormat:', parseAndFormat);

    // Special handling for schemas data - showing as normal JSON now
    if (parseAndFormat.type === 'json') {
      console.log('JSON data structure:', parseAndFormat.data);
      console.log('Has schemas property?', parseAndFormat.data?.schemas);
      console.log('Data keys:', Object.keys(parseAndFormat.data || {}));
      
      // Remove special schema formatting - just show normal JSON
      // if (parseAndFormat.data?.schemas) {
      //   console.log('Rendering schemas data:', parseAndFormat.data.schemas);
      //   return (
      //     <div className="space-y-3">
      //       <div className="flex items-center gap-2 mb-3">
      //         <Database className="h-4 w-4 text-blue-600" />
      //         <span className="font-medium text-sm">Available Schemas ({parseAndFormat.data.schemas.length})</span>
      //       </div>
      //       
      //       <div className="grid gap-2">
      //         {parseAndFormat.data.schemas.map((schema: any, index: number) => (
      //           <Card key={index} className="p-3 bg-card/50 border-l-2 border-l-blue-500">
      //             <div className="flex items-center justify-between">
      //               <div>
      //                 <div className="font-medium text-sm text-foreground">{schema.schemaName}</div>
      //                 {schema.schemaDescription && (
      //                   <div className="text-xs text-muted-foreground">{schema.schemaDescription}</div>
      //                 )}
      //               </div>
      //               <Badge variant={schema.isEmpty ? "secondary" : "default"} className="text-xs">
      //                 {schema.isEmpty ? "Empty" : "Has Data"}
      //               </Badge>
      //             </div>
      //           </Card>
      //         ))}
      //       </div>
      //     </div>
      //   );
      // }
    }

    // Regular JSON display with better formatting
    console.log('Rendering regular JSON display');
    return (
      <div className="space-y-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
          <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
            Data Type: {parseAndFormat.type}
          </div>
          <ScrollArea className="h-64 w-full">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
              <code className="text-foreground">
                {parseAndFormat.formatted}
              </code>
            </pre>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const ToolIcon = getToolIcon(message.toolName);
  
  return (
    <div className="space-y-3">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start h-auto p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30"
          >
            <div className="flex items-center gap-3 w-full">
              <ToolIcon className="h-4 w-4 text-green-600" />
              <div className="flex-1 text-left">
                <div className="font-medium text-green-900 dark:text-green-100">
                  {message.toolName || 'Tool Execution'}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  Click to view result
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-green-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-green-600" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3">
          {parseAndFormat && (
            <div className="pl-3 border-l-2 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {/* Removed badges and labels for cleaner display */}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              
              {renderFormattedData()}
              
              {parseAndFormat.error && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                  Error: {parseAndFormat.error}
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ToolResultDisplay;