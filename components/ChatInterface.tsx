import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BrainCircuit, Info, X, Lightbulb, TrendingUp, ShieldAlert, BarChart3, Trash2 } from 'lucide-react';
import { Message, Role } from '../types';
import { streamGeminiResponse } from '../services/geminiService';
import { ThinkingIndicator } from './ThinkingIndicator';

interface ChatInterfaceProps {
  onClose?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Role.MODEL,
      text: "System Online. I am NEXUS-9. My processing core is calibrated for advanced market prediction and volatility analysis. How may I assist your portfolio today?",
      timestamp: Date.now(),
      isThinking: false
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load History
  useEffect(() => {
    const savedHistory = localStorage.getItem('nexus9_chat_history');
    if (savedHistory) {
        try {
            const parsed = JSON.parse(savedHistory);
            if (parsed.length > 0) setMessages(parsed);
        } catch (e) {
            console.error("Failed to load chat history", e);
        }
    }
  }, []);

  // Save History
  useEffect(() => {
    if (messages.length > 0) {
        localStorage.setItem('nexus9_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: inputValue.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const botMsgId = (Date.now() + 1).toString();
    
    setMessages(prev => [...prev, {
      id: botMsgId,
      role: Role.MODEL,
      text: '', 
      timestamp: Date.now(),
      isThinking: isThinkingMode
    }]);

    try {
      const historyForApi = messages.filter(m => m.id !== botMsgId);
      const stream = streamGeminiResponse(historyForApi, userMsg.text, isThinkingMode);
      
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === botMsgId ? { ...msg, text: fullText } : msg
        ));
      }

    } catch (error) {
      console.error("Streaming error", error);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearHistory = () => {
      setMessages([{
        id: Date.now().toString(),
        role: Role.MODEL,
        text: "Memory Core Purged. Ready for new input.",
        timestamp: Date.now(),
        isThinking: false
      }]);
      localStorage.removeItem('nexus9_chat_history');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickPrompt = (text: string) => {
      setInputValue(text);
      inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-surface/50 w-full md:w-[450px] shadow-2xl relative overflow-hidden">
        
      {/* Header */}
      <div className="p-4 border-b border-surface/50 bg-background/95 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
          
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 text-primary animate-pulse-slow">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-widest">NEXUS-9</h2>
            <p className="text-[10px] text-secondary font-mono uppercase">AI Quant Analyst</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={handleClearHistory} 
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                title="Clear History"
            >
                <Trash2 size={14} />
            </button>
            <button
            onClick={() => setIsThinkingMode(!isThinkingMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border ${
                isThinkingMode 
                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                : 'bg-surface border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            >
            <BrainCircuit size={14} />
            <span className="hidden sm:inline">{isThinkingMode ? 'Thinking' : 'Standard'}</span>
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg, idx) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
              ${msg.role === Role.USER ? 'bg-slate-700 text-slate-300' : 'bg-primary/20 text-primary border border-primary/30'}
            `}>
              {msg.role === Role.USER ? <User size={16} /> : <Bot size={16} />}
            </div>

            <div className={`
              max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed whitespace-pre-wrap font-mono
              ${msg.role === Role.USER 
                ? 'bg-surface border border-slate-700 text-slate-100 rounded-tr-sm' 
                : 'bg-gradient-to-br from-surface to-background border border-primary/20 text-slate-200 rounded-tl-sm shadow-lg'}
            `}>
              {msg.isThinking && idx === messages.length - 1 && isLoading && (
                 <div className="mb-2 text-xs text-primary font-mono flex items-center gap-1 opacity-75">
                    <BrainCircuit size={10} className="animate-pulse"/>
                    <span>Deep reasoning active...</span>
                 </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role === Role.USER && (
          <div className="flex justify-start animate-in fade-in duration-300">
             {isThinkingMode ? (
               <ThinkingIndicator />
             ) : (
                <div className="flex items-center space-x-2 p-3 bg-surface/50 rounded-xl rounded-tl-sm border border-slate-800">
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                </div>
             )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/95 backdrop-blur border-t border-surface/50 pb-safe">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isThinkingMode ? "Initiate complex query..." : "Ask NEXUS-9..."}
            className={`
              w-full bg-surface/50 text-white placeholder-slate-500 rounded-xl py-3 pl-4 pr-12 
              border focus:outline-none transition-all duration-300 text-sm md:text-base font-mono
              ${isThinkingMode 
                ? 'border-primary/50 focus:border-primary focus:shadow-[0_0_20px_rgba(139,92,246,0.1)]' 
                : 'border-slate-700 focus:border-slate-500'}
            `}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors
              ${inputValue.trim() && !isLoading 
                ? 'bg-primary text-white hover:bg-violet-600 shadow-lg shadow-violet-900/20' 
                : 'bg-transparent text-slate-600 cursor-not-allowed'}
            `}
          >
            {isThinkingMode && isLoading ? (
               <Sparkles size={18} className="animate-spin" />
            ) : (
               <Send size={18} />
            )}
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button 
                onClick={() => handleQuickPrompt('Analyze current market volatility')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface/50 border border-white/5 hover:border-primary/30 hover:bg-primary/10 transition-all text-xs text-slate-300 hover:text-white"
            >
                <TrendingUp size={12} className="text-emerald-400" />
                Analyze Volatility
            </button>
            <button 
                onClick={() => handleQuickPrompt('Predict price action for next 24h')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface/50 border border-white/5 hover:border-primary/30 hover:bg-primary/10 transition-all text-xs text-slate-300 hover:text-white"
            >
                <BarChart3 size={12} className="text-secondary" />
                Prediction
            </button>
            <button 
                onClick={() => handleQuickPrompt('Evaluate portfolio risk exposure')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface/50 border border-white/5 hover:border-primary/30 hover:bg-primary/10 transition-all text-xs text-slate-300 hover:text-white"
            >
                <ShieldAlert size={12} className="text-rose-400" />
                Risk Exposure
            </button>
        </div>
      </div>
    </div>
  );
};