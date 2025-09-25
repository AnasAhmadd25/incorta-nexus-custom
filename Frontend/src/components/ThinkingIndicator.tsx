import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';

const ThinkingIndicator: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-600">
        <Bot className="h-4 w-4" />
      </div>
      
      <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-muted-foreground italic">Copilot is thinking...</span>
        </div>
        
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ThinkingIndicator;