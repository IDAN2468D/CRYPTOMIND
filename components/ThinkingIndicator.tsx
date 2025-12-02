import React from 'react';
import { BrainCircuit } from 'lucide-react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-3 p-4 bg-surface/50 border border-primary/20 rounded-lg max-w-xs animate-pulse">
      <div className="relative">
        <BrainCircuit className="w-6 h-6 text-primary" />
        <div className="absolute inset-0 bg-primary/20 blur-md rounded-full animate-ping"></div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-primary">Deep Thinking</span>
        <span className="text-xs text-slate-400">Analyzing complex market data...</span>
      </div>
    </div>
  );
};