import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChat } from '@/contexts/ChatContext';

const ModelSelector: React.FC = () => {
  const { currentModel, switchModel, clearMessages, isConnected, isAuthenticated } = useChat();
  const [isLoading, setIsLoading] = useState(false);

  console.log('ModelSelector render - currentModel:', currentModel);

  const models = [
    {
      id: 'claude',
      name: 'Claude',
      description: 'Anthropic Claude 3.5 Sonnet'
    },
    {
      id: 'gemini',
      name: 'Gemini',
      description: 'Google Gemini 2.5 Flash Lite'
    }
  ];

  const currentModelData = models.find(model => model.id === currentModel) || models[0];
  console.log('ModelSelector - currentModelData:', currentModelData);

  const handleModelSwitch = async (modelId: string) => {
    console.log('handleModelSwitch called with:', modelId, 'current:', currentModel);
    
    if (modelId === currentModel) {
      console.log('Same model selected, skipping');
      return;
    }
    
    if (!isConnected || !isAuthenticated || isLoading) {
      console.log('Cannot switch - connected:', isConnected, 'authenticated:', isAuthenticated, 'loading:', isLoading);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Switching to model:', modelId);
      
      // Clear chat first
      clearMessages();
      
      // Then switch model
      await switchModel(modelId);
      console.log('Model switch completed successfully');
    } catch (error) {
      console.error('Failed to switch model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !isConnected || !isAuthenticated || isLoading;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDisabled}
          className="flex items-center space-x-2 hover:bg-accent"
          title={`Current model: ${currentModelData.name}`}
        >
          <span className="font-medium">{currentModelData.name}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[9999]" sideOffset={5}>
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => handleModelSwitch(model.id)}
            disabled={model.id === currentModel || isLoading}
            className="flex items-start space-x-3 cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{model.name}</span>
                {model.id === currentModel && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{model.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ModelSelector;
