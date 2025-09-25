import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

const ConnectionStatus: React.FC = () => {
  const { connectionStatus, isConnected } = useChat();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          className: 'bg-green-500/10 text-green-600 border-green-500/20',
          show: false // Don't show when connected
        };
      case 'connecting':
        return {
          icon: Loader2,
          text: 'Connecting...',
          className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          show: true,
          animate: true
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Disconnected - Reconnecting...',
          className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
          show: true
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Connection Error',
          className: 'bg-red-500/10 text-red-600 border-red-500/20',
          show: true
        };
      default:
        return { show: false };
    }
  };

  const config = getStatusConfig();

  if (!config.show) return null;

  const Icon = config.icon!;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="border-b border-border"
      >
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${config.className}`}>
            <Icon 
              className={`h-3 w-3 ${config.animate ? 'animate-spin' : ''}`} 
            />
            {config.text}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConnectionStatus;