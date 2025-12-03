import React, { useState, useEffect, useMemo } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { CoinDetail } from './components/CoinDetail';
import { Activity, TrendingUp, DollarSign, Wallet, Menu, Search, X, ArrowUpRight, ArrowDownRight, CreditCard, RefreshCw, History, CheckCircle, Bot, ChevronRight, Play, Pause, Zap, BrainCircuit, ShieldAlert } from 'lucide-react';
import { getMarketData } from './services/cryptoService';
import { getAutoTradeDecision } from './services/geminiService';
import { Coin, UserWallet, PortfolioItem, Transaction, TradeDecision } from './types';
import introJs from 'intro.js';

function App() {
  const [activeView, setActiveView] = useState<'market' | 'portfolio' | 'history'>('market');
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Refresh Timer State
  const REFRESH_INTERVAL = 60;
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(REFRESH_INTERVAL);

  // Mobile UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Auto-Trading State
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [lastAutoTrade, setLastAutoTrade] = useState<string | null>(null);
  const [aiThinkingCoin, setAiThinkingCoin] = useState<string | null>(null);

  // Wallet State
  const [wallet, setWallet] = useState<UserWallet>({
    usdBalance: 50000, // Start with $50k simulated
    assets: {}
  });

  // Transaction History
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Notifications
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Trading Modal State
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [viewingCoin, setViewingCoin] = useState<Coin | null>(null); // For Detailed View
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState(''); 
  
  // Initialize Tour
  useEffect(() => {
      const tourCompleted = localStorage.getItem('nexus_tour_completed');
      if (!tourCompleted && !isLoading && coins.length > 0) {
          setTimeout(() => {
            introJs()
                .setOptions({
                    steps: [
                        {
                            title: "Welcome to CryptoMind",
                            intro: "Your advanced AI-powered crypto dashboard.",
                        },
                        {
                            element: document.querySelector('[data-intro="ai-toggle"]'),
                            title: "NEXUS-9 AI",
                            intro: "Toggle the AI Auto-Trader here to let NEXUS-9 trade autonomously based on volatility.",
                            position: 'bottom'
                        },
                        {
                            element: document.querySelector('[data-intro="market-grid"]'),
                            title: "Live Market",
                            intro: "Real-time market data. Click any coin for detailed charts and analysis.",
                            position: 'top'
                        },
                        {
                            element: document.querySelector('[data-intro="portfolio-nav"]'),
                            title: "Portfolio Tracking",
                            intro: "Track your assets and net worth here.",
                            position: 'right'
                        }
                    ],
                    showProgress: true,
                    showBullets: false,
                    exitOnOverlayClick: false,
                    overlayOpacity: 0.8
                })
                .onexit(() => localStorage.setItem('nexus_tour_completed', 'true'))
                .oncomplete(() => localStorage.setItem('nexus_tour_completed', 'true'))
                .start();
          }, 1500);
      }
  }, [isLoading, coins]);

  // Fetch Data with Timer
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await getMarketData();
        // Always set coins if we get an array, even if it's the mock data
        if (Array.isArray(data) && data.length > 0) {
          setCoins(data);
        } else {
           console.error("Received invalid coin data structure");
        }
      } catch (error) {
        console.error("Critical failure to load data", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1) {
          loadData();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // AUTO TRADING BOT LOOP
  useEffect(() => {
      if (!isAutoTrading || coins.length === 0) return;

      const runAutoTrade = async () => {
          // 1. Pick a random coin to analyze to simulate scanning
          const randomIndex = Math.floor(Math.random() * Math.min(coins.length, 20)); // Top 20 coins
          const candidateCoin = coins[randomIndex];
          
          if (!candidateCoin) return;

          setAiThinkingCoin(candidateCoin.id);

          // 2. Ask Gemini for decision
          try {
              const holdings = wallet.assets[candidateCoin.id];
              const decision: TradeDecision = await getAutoTradeDecision(candidateCoin, wallet.usdBalance, holdings);

              if (decision.decision === 'HOLD') {
                  setLastAutoTrade(`HOLD ${candidateCoin.symbol} - ${decision.reason}`);
              } else if (decision.amountUSD > 0) {
                  // Execute Trade
                  executeTrade(candidateCoin, decision.decision === 'BUY' ? 'buy' : 'sell', decision.amountUSD, true, decision.reason);
              }
          } catch (e) {
              console.error("Auto trade loop error", e);
          } finally {
              setAiThinkingCoin(null);
          }
      };

      // Run every 20 seconds
      const timer = setInterval(runAutoTrade, 20000);
      return () => clearInterval(timer);
  }, [isAutoTrading, coins, wallet]);

  // Clear notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Filter Coins
  const filteredCoins = useMemo(() => {
    if (!coins) return [];
    return coins.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coins, searchTerm]);

  // Calculate Portfolio Value
  const portfolioValue = useMemo(() => {
    let total = wallet.usdBalance;
    Object.values(wallet.assets).forEach((asset: PortfolioItem) => {
      const currentPrice = coins.find(c => c.id === asset.coinId)?.current_price || asset.averageBuyPrice;
      total += asset.amount * currentPrice;
    });
    return total;
  }, [wallet, coins]);

  // Unified Trade Execution Logic
  const executeTrade = (coin: Coin, type: 'buy' | 'sell', amountUSD: number, isAuto: boolean = false, reason?: string) => {
      const price = coin.current_price;
      const amountCoin = amountUSD / price;

      if (type === 'buy') {
          if (wallet.usdBalance < amountUSD) {
              if (!isAuto) setNotification({ message: 'Insufficient USD Balance', type: 'error' });
              return;
          }
          
          setWallet(prev => {
            const existing = prev.assets[coin.id] || { coinId: coin.id, symbol: coin.symbol, amount: 0, averageBuyPrice: 0 };
            const newAmount = existing.amount + amountCoin;
            const totalCost = (existing.amount * existing.averageBuyPrice) + amountUSD;
            
            return {
              usdBalance: prev.usdBalance - amountUSD,
              assets: {
                ...prev.assets,
                [coin.id]: {
                  ...existing,
                  amount: newAmount,
                  averageBuyPrice: totalCost / newAmount
                }
              }
            };
          });
      } else {
          const asset = wallet.assets[coin.id];
          if (!asset || asset.amount < amountCoin) {
             if (!isAuto) setNotification({ message: `Insufficient ${coin.symbol.toUpperCase()} Balance`, type: 'error' });
             return;
          }

          setWallet(prev => {
            const newAmount = asset.amount - amountCoin;
            const newAssets = { ...prev.assets };
            
            if (newAmount <= 0.000001) {
                delete newAssets[coin.id];
            } else {
                newAssets[coin.id] = { ...asset, amount: newAmount };
            }

            return {
              usdBalance: prev.usdBalance + amountUSD,
              assets: newAssets
            };
          });
      }

      // Record Transaction
      const newTransaction: Transaction = {
          id: Date.now().toString(),
          type: type,
          coinId: coin.id,
          symbol: coin.symbol,
          amount: amountCoin,
          price: price,
          totalValue: amountUSD,
          timestamp: Date.now(),
          isAutoTrade: isAuto,
          aiReason: reason
      };
      setTransactions(prev => [newTransaction, ...prev]);

      if (isAuto) {
          setLastAutoTrade(`${type.toUpperCase()} ${coin.symbol} - ${reason}`);
          setNotification({ message: `AI Executed: ${type.toUpperCase()} ${coin.symbol}`, type: 'info' });
      } else {
          setNotification({ 
              message: `Successfully ${type === 'buy' ? 'bought' : 'sold'} ${coin.name}`, 
              type: 'success' 
          });
          setTradeAmount('');
          setSelectedCoin(null);
      }
  };

  const handleManualTrade = () => {
    if (!selectedCoin) return;
    const amountUSD = parseFloat(tradeAmount);
    if (isNaN(amountUSD) || amountUSD <= 0) {
        setNotification({ message: 'Please enter a valid amount', type: 'error' });
        return;
    }
    executeTrade(selectedCoin, tradeType, amountUSD, false);
  };
  
  // Handle opening trade modal from detail view
  const openTradeFromDetail = (type: 'buy' | 'sell') => {
      if (viewingCoin) {
          setSelectedCoin(viewingCoin);
          setTradeType(type);
      }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatDate = (timestamp: number) => 
    new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-primary/30">
      
      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-72 h-full bg-slate-900 border-r border-white/10 p-6 space-y-8 animate-in slide-in-from-left duration-300 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
             <div className="flex justify-between items-center border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/20 rounded-xl text-primary border border-primary/50">
                     <Activity size={20} />
                   </div>
                   <span className="font-mono font-bold text-xl tracking-tight">CRYPTO<span className="text-primary">MIND</span></span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                    <X size={24} />
                </button>
             </div>
             
             <nav className="flex flex-col gap-3">
                {[
                  { id: 'market', icon: TrendingUp, label: 'Live Market' },
                  { id: 'portfolio', icon: Wallet, label: 'Portfolio' },
                  { id: 'history', icon: History, label: 'Transactions' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveView(item.id as any); setViewingCoin(null); setIsMobileMenuOpen(false); }}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${activeView === item.id ? 'bg-primary/20 text-white border border-primary/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                     <div className="flex items-center gap-3">
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                     </div>
                     {activeView === item.id && <ChevronRight size={16} className="text-primary" />}
                  </button>
                ))}
             </nav>
             
             <div className="mt-auto pt-6 border-t border-white/5">
                <div className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-2">My Net Worth</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{formatCurrency(portfolioValue)}</div>
             </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-20 border-r border-white/5 items-center py-6 bg-slate-900/50 backdrop-blur-xl gap-8 z-20">
        <div className="p-2 bg-primary/20 rounded-xl text-primary border border-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
          <Activity size={24} />
        </div>
        <nav className="flex flex-col gap-6 text-slate-500">
          <button 
            onClick={() => { setActiveView('market'); setViewingCoin(null); }}
            className={`p-3 rounded-xl transition-all duration-300 ${activeView === 'market' ? 'text-white bg-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.2)]' : 'hover:text-white hover:bg-white/5'}`}
            title="Market"
          >
            <TrendingUp size={20} />
          </button>
          <button 
            onClick={() => { setActiveView('portfolio'); setViewingCoin(null); }}
            data-intro="portfolio-nav"
            className={`p-3 rounded-xl transition-all duration-300 ${activeView === 'portfolio' ? 'text-white bg-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.2)]' : 'hover:text-white hover:bg-white/5'}`}
            title="Portfolio"
          >
            <Wallet size={20} />
          </button>
          <button 
            onClick={() => { setActiveView('history'); setViewingCoin(null); }}
            className={`p-3 rounded-xl transition-all duration-300 ${activeView === 'history' ? 'text-white bg-primary/20 shadow-[0_0_20px_rgba(139,92,246,0.2)]' : 'hover:text-white hover:bg-white/5'}`}
            title="Transaction History"
          >
            <History size={20} />
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Dynamic Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            {activeView === 'market' && (
                <>
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[120px] animate-pulse-slow"></div>
                    <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[100px] animate-pulse-slow" style={{animationDelay: '1s'}}></div>
                    <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[80px]" style={{animationDelay: '2s'}}></div>
                </>
            )}
        </div>

        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-slate-900/40 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-400 hover:text-white transition-colors"><Menu size={24} /></button>
             <div>
                <h1 className="font-mono font-bold text-lg md:text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 leading-none">
                    CRYPTO<span className="text-primary drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">MIND</span>
                </h1>
                {isAutoTrading && (
                    <div className="flex items-center gap-1 mt-0.5 animate-in fade-in">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[9px] text-emerald-400 font-mono tracking-wider">AI TRADING ACTIVE</span>
                    </div>
                )}
             </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
             
             {/* Auto Trade Toggle */}
             <button 
                data-intro="ai-toggle"
                onClick={() => setIsAutoTrading(!isAutoTrading)}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${isAutoTrading ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
             >
                {isAutoTrading ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                <span className="text-xs font-bold font-mono tracking-wide">{isAutoTrading ? 'NEXUS ACTIVE' : 'START NEXUS'}</span>
             </button>

             {/* Refresh Timer */}
             <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <RefreshCw size={12} className={isLoading ? "animate-spin text-primary" : "text-slate-500"} />
                <span>{isLoading ? 'Updating...' : `Update in ${timeUntilRefresh}s`}</span>
             </div>

             <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Net Worth</span>
                <span className="font-mono font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{formatCurrency(portfolioValue)}</span>
             </div>
             
             {/* Mobile View Indicator / Bot Toggle */}
             <div className="flex gap-2">
                <button 
                  onClick={() => setIsMobileChatOpen(true)}
                  className="md:hidden w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-primary/50 relative active:scale-95 transition-transform"
                >
                   <Bot size={18} />
                   {isAutoTrading && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
                </button>

                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-xs font-bold shadow-lg shadow-purple-900/50 border border-white/10">
                    {activeView === 'market' ? 'M' : activeView === 'portfolio' ? 'P' : 'H'}
                </div>
             </div>
          </div>
        </header>

        {/* AI Status Bar (Visible when Auto-Trading) */}
        {isAutoTrading && (
            <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center justify-between text-[10px] md:text-xs font-mono text-primary/90 animate-in slide-in-from-top-2 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Zap size={12} className={aiThinkingCoin ? "animate-bounce text-yellow-400" : ""} />
                    {aiThinkingCoin 
                        ? <span>Calculating volatility index for <span className="font-bold text-white">{coins.find(c => c.id === aiThinkingCoin)?.symbol.toUpperCase()}</span>...</span> 
                        : <span>NEXUS-9 scanning market for arbitrage & breakdown...</span>}
                </div>
                {lastAutoTrade && <span className="hidden sm:inline opacity-70">Last Op: {lastAutoTrade}</span>}
            </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10 scroll-smooth pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 h-full">
            
            {/* View Header (Only show if NOT in detailed view) */}
            {!viewingCoin && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div className="space-y-1 md:space-y-2">
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-md">
                            {activeView === 'market' && 'Live Market'}
                            {activeView === 'portfolio' && 'Your Portfolio'}
                            {activeView === 'history' && 'Transaction History'}
                        </h2>
                        <p className="text-sm md:text-base text-slate-400 font-medium">
                            {activeView === 'market' && 'Real-time prices and trading execution.'}
                            {activeView === 'portfolio' && 'Track your asset performance and allocation.'}
                            {activeView === 'history' && 'A ledger of your past trading activities.'}
                        </p>
                    </div>
                    
                    {activeView === 'market' && (
                        <div className="relative w-full sm:w-64 group">
                            <input 
                                type="text" 
                                placeholder="Search coins..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 text-white transition-all shadow-inner"
                            />
                            <Search className="absolute left-3 top-3 text-slate-500 group-focus-within:text-primary transition-colors" size={16} />
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Auto-Trade Banner (Only visible on mobile if inactive) */}
            {!isAutoTrading && activeView === 'market' && !viewingCoin && (
                <div className="md:hidden bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-2"><BrainCircuit size={16}/> NEXUS-9 Auto-Trader</h3>
                        <p className="text-xs text-slate-400 mt-1">Activate autonomous volatility trading.</p>
                    </div>
                    <button 
                        onClick={() => setIsAutoTrading(true)}
                        className="bg-primary text-white p-2.5 rounded-full shadow-lg shadow-primary/20 active:scale-90 transition-transform"
                    >
                        <Play size={20} fill="currentColor" />
                    </button>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <RefreshCw className="animate-spin text-primary drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" size={32} />
                    <p className="text-slate-400 animate-pulse font-mono text-sm">Syncing with blockchain nodes...</p>
                </div>
            )}

            {/* MARKET VIEW */}
            {!isLoading && activeView === 'market' && (
                <>
                {viewingCoin ? (
                    <CoinDetail 
                        coin={viewingCoin} 
                        onBack={() => setViewingCoin(null)} 
                        onTrade={openTradeFromDetail}
                    />
                ) : filteredCoins.length === 0 && !searchTerm ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                        <ShieldAlert size={48} className="text-slate-600 mb-2" />
                        <h3 className="text-lg font-bold text-slate-300">Market Data Unavailable</h3>
                        <p className="max-w-md text-center text-sm">
                            Unable to fetch live crypto data. This may be due to API rate limits or connectivity issues.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-bold transition-colors border border-primary/20"
                        >
                            Retry Connection
                        </button>
                    </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" data-intro="market-grid">
                    {filteredCoins.map((coin) => (
                        <div 
                            key={coin.id} 
                            onClick={() => setViewingCoin(coin)}
                            className={`
                                cursor-pointer group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-all duration-300 ease-out will-change-transform
                                ${aiThinkingCoin === coin.id 
                                    ? 'border-primary/60 bg-primary/10 shadow-[0_0_30px_rgba(139,92,246,0.25)] scale-[1.03] ring-1 ring-primary/30' 
                                    : 'border-white/5 bg-gradient-to-br from-white/[0.05] via-white/[0.01] to-black/20 hover:border-primary/40 hover:bg-slate-800/80 hover:scale-[1.03] hover:shadow-[0_0_35px_-5px_rgba(139,92,246,0.4)] hover:ring-1 hover:ring-primary/20'
                                }
                            `}
                        >
                            
                            {/* AI Thinking Indicator overlay */}
                            {aiThinkingCoin === coin.id && (
                                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-primary/40 shadow-lg shadow-primary/10">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></div>
                                    <span className="text-[10px] text-primary font-mono font-bold tracking-wider">ANALYZING</span>
                                </div>
                            )}

                            {/* Card Hover Glow Effects */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 translate-x-10 group-hover:translate-x-0 pointer-events-none"></div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="relative group-hover:scale-110 transition-transform duration-300">
                                        <img src={coin.image} alt={coin.name} className="w-11 h-11 rounded-full bg-slate-800 shadow-lg ring-2 ring-white/5 group-hover:ring-primary/30 transition-all" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-100 text-base group-hover:text-white transition-colors truncate">{coin.name}</h3>
                                        <span className="text-xs text-slate-400 uppercase font-mono tracking-wider group-hover:text-primary/80 transition-colors">{coin.symbol}</span>
                                    </div>
                                </div>
                                <span className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-sm transition-transform group-hover:scale-105 ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
                                    {coin.price_change_percentage_24h >= 0 ? <ArrowUpRight size={12} strokeWidth={3}/> : <ArrowDownRight size={12} strokeWidth={3}/>}
                                    {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                                </span>
                            </div>
                            
                            <div className="flex items-baseline justify-between mt-2 relative z-10">
                                <div className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-sm group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                                    {formatCurrency(coin.current_price)}
                                </div>
                            </div>

                            {/* High / Low 24h Stats */}
                            <div className="flex gap-4 mt-1 mb-2 text-[10px] font-mono text-slate-500 relative z-10">
                                <span className="flex items-center gap-1"><span className="text-emerald-500/80">H:</span> {formatCurrency(coin.high_24h)}</span>
                                <span className="flex items-center gap-1"><span className="text-rose-500/80">L:</span> {formatCurrency(coin.low_24h)}</span>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-2 md:gap-4 relative z-10">
                                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider hidden sm:block group-hover:text-slate-400 transition-colors">
                                    MCap ${(coin.market_cap / 1e9).toFixed(1)}B
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto opacity-80 group-hover:opacity-100 transition-opacity delay-75">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedCoin(coin); setTradeType('buy'); }}
                                        className="flex-1 sm:flex-none px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all uppercase tracking-wider hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:-translate-y-0.5"
                                    >
                                        Buy
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedCoin(coin); setTradeType('sell'); }}
                                        className="flex-1 sm:flex-none px-4 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all uppercase tracking-wider hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:-translate-y-0.5"
                                    >
                                        Sell
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                )}
                </>
            )}

            {/* PORTFOLIO VIEW */}
            {!isLoading && activeView === 'portfolio' && (
                <div className="space-y-6">
                    {/* Balance Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border border-white/10 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex items-center gap-2 text-slate-400 mb-2 relative z-10">
                                <DollarSign size={18} />
                                <span className="text-sm font-semibold uppercase tracking-wider">Available USD Balance</span>
                            </div>
                            <div className="text-3xl md:text-4xl font-mono font-bold text-white relative z-10">
                                {formatCurrency(wallet.usdBalance)}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-slate-900/60 border border-white/10 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex items-center gap-2 text-slate-400 mb-2 relative z-10">
                                <Activity size={18} />
                                <span className="text-sm font-semibold uppercase tracking-wider">Total Asset Value</span>
                            </div>
                            <div className="text-3xl md:text-4xl font-mono font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)] relative z-10">
                                {formatCurrency(portfolioValue - wallet.usdBalance)}
                            </div>
                        </div>
                    </div>

                    {/* Assets Table */}
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                        {/* Mobile List View for Assets */}
                        <div className="md:hidden divide-y divide-white/5">
                            {Object.keys(wallet.assets).length === 0 ? (
                                <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
                                    <Wallet size={32} className="opacity-20" />
                                    <p className="text-sm">No assets found.</p>
                                </div>
                            ) : (
                                Object.values(wallet.assets).map((asset: PortfolioItem) => {
                                    const coin = coins.find(c => c.id === asset.coinId);
                                    if (!coin) return null;
                                    const value = asset.amount * coin.current_price;

                                    return (
                                        <div key={asset.coinId} className="p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                                                    <div>
                                                        <div className="font-bold text-white">{coin.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{coin.symbol.toUpperCase()}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-white">{formatCurrency(value)}</div>
                                                    <div className="text-xs text-slate-400">{asset.amount.toFixed(4)} {coin.symbol.toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                            <div className="grid grid-cols-5 bg-white/5 p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/5">
                                <div className="col-span-2 pl-2">Asset</div>
                                <div className="text-right">Balance</div>
                                <div className="text-right">Price</div>
                                <div className="text-right pr-2">Value</div>
                            </div>
                            <div className="divide-y divide-white/5">
                                {Object.keys(wallet.assets).length === 0 ? (
                                    <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                                        <Wallet size={48} className="opacity-20" />
                                        <p>No assets found. Go to the market to start trading.</p>
                                    </div>
                                ) : (
                                    Object.values(wallet.assets).map((asset: PortfolioItem) => {
                                        const coin = coins.find(c => c.id === asset.coinId);
                                        if (!coin) return null;
                                        const value = asset.amount * coin.current_price;
                                        
                                        return (
                                            <div key={asset.coinId} className="grid grid-cols-5 p-4 items-center hover:bg-white/5 transition-colors group">
                                                <div className="col-span-2 flex items-center gap-3 pl-2">
                                                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full shadow-sm" />
                                                    <div>
                                                        <div className="font-bold text-slate-200 group-hover:text-white">{coin.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{coin.symbol.toUpperCase()}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right font-mono text-sm text-slate-300">
                                                    {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                                </div>
                                                <div className="text-right font-mono text-sm text-slate-300">
                                                    {formatCurrency(coin.current_price)}
                                                </div>
                                                <div className="text-right font-mono text-sm font-bold text-white pr-2">
                                                    {formatCurrency(value)}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY VIEW */}
            {!isLoading && activeView === 'history' && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                    {/* Mobile History View */}
                    <div className="md:hidden divide-y divide-white/5">
                        {transactions.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No transactions.</div>
                        ) : (
                            transactions.map(tx => (
                                <div key={tx.id} className="p-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${tx.type === 'buy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                                {tx.isAutoTrade ? <Bot size={14}/> : (tx.type === 'buy' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-white flex items-center gap-2">
                                                    {tx.type === 'buy' ? 'Bought' : 'Sold'} {tx.symbol.toUpperCase()}
                                                    {tx.isAutoTrade && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">AI</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">{formatDate(tx.timestamp)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-white text-sm">{formatCurrency(tx.totalValue)}</div>
                                            <div className="text-xs text-slate-400 font-mono">@{formatCurrency(tx.price)}</div>
                                        </div>
                                    </div>
                                    {tx.aiReason && (
                                        <div className="text-xs text-slate-400 bg-white/5 p-2 rounded-lg italic">
                                            "{tx.aiReason}"
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop History View */}
                    <div className="hidden md:block">
                        <div className="grid grid-cols-6 bg-white/5 p-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/5">
                            <div className="col-span-2 pl-2">Transaction</div>
                            <div className="text-right">Price</div>
                            <div className="text-right">Total</div>
                            <div className="col-span-2 text-right pr-2">Reason / Time</div>
                        </div>
                        <div className="divide-y divide-white/5">
                            {transactions.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                                    <History size={48} className="opacity-20" />
                                    <p>No trading history available yet.</p>
                                </div>
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="grid grid-cols-6 p-4 items-center hover:bg-white/5 transition-colors">
                                        <div className="col-span-2 flex items-center gap-3 pl-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${tx.type === 'buy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                                {tx.isAutoTrade ? <Bot size={14}/> : (tx.type === 'buy' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200 flex items-center gap-2">
                                                    {tx.type === 'buy' ? 'Bought' : 'Sold'} {tx.symbol.toUpperCase()}
                                                    {tx.isAutoTrade && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono border border-primary/20">AI</span>}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {tx.amount.toFixed(6)} {tx.symbol.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right font-mono text-sm text-slate-300">
                                            {formatCurrency(tx.price)}
                                        </div>
                                        <div className="text-right font-mono text-sm font-bold text-white">
                                            {formatCurrency(tx.totalValue)}
                                        </div>
                                        <div className="col-span-2 text-right pr-2">
                                            <div className="text-xs text-slate-500 font-mono">{formatDate(tx.timestamp)}</div>
                                            {tx.aiReason && <div className="text-[10px] text-primary/80 italic mt-0.5 truncate max-w-[200px] ml-auto" title={tx.aiReason}>{tx.aiReason}</div>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Trade Modal */}
        {selectedCoin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/5">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <CreditCard className="text-primary" size={20} />
                            Trade {selectedCoin.name}
                        </h3>
                        <button onClick={() => setSelectedCoin(null)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* Buy/Sell Toggles */}
                        <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                            <button 
                                onClick={() => setTradeType('buy')}
                                className={`py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${tradeType === 'buy' ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-900/20 border border-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Buy
                            </button>
                            <button 
                                onClick={() => setTradeType('sell')}
                                className={`py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${tradeType === 'sell' ? 'bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-900/20 border border-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Sell
                            </button>
                        </div>

                        {/* Info Rows */}
                        <div className="space-y-3 py-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Current Price</span>
                                <span className="font-mono text-white tracking-wide">{formatCurrency(selectedCoin.current_price)}</span>
                            </div>
                             
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Available Balance</span>
                                <span className="font-mono text-white tracking-wide">
                                    {tradeType === 'buy' 
                                      ? formatCurrency(wallet.usdBalance) 
                                      : `${(wallet.assets[selectedCoin.id]?.amount || 0).toFixed(6)} ${selectedCoin.symbol.toUpperCase()}`}
                                </span>
                            </div>
                        </div>

                        {/* Input */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                                Amount (USD)
                            </label>
                            <div className="relative group">
                                <DollarSign size={16} className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-white transition-colors" />
                                <input 
                                    type="number" 
                                    value={tradeAmount}
                                    onChange={(e) => setTradeAmount(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 font-mono transition-all"
                                />
                            </div>
                        </div>

                        {/* Estimate */}
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center text-sm">
                            <span className="text-slate-400">Estimated {selectedCoin.symbol.toUpperCase()}</span>
                            <span className="font-mono text-white font-bold">
                                {(parseFloat(tradeAmount || '0') / selectedCoin.current_price).toFixed(6)}
                            </span>
                        </div>

                        {/* Action Button */}
                        <button 
                            onClick={handleManualTrade}
                            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] ${tradeType === 'buy' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'}`}
                        >
                            Confirm {tradeType === 'buy' ? 'Purchase' : 'Sale'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Notification Toast */}
        {notification && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-3 z-[60] ${notification.type === 'info' ? 'bg-slate-800/90 border-slate-600 text-white' : (notification.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-100' : 'bg-rose-900/80 border-rose-500/30 text-rose-100')}`}>
                {notification.type === 'info' ? <Bot size={20} className="text-primary"/> : <CheckCircle size={20} className={notification.type === 'success' ? 'text-emerald-400' : 'text-rose-400'} />}
                <span className="font-medium">{notification.message}</span>
            </div>
        )}

      </main>

      {/* AI Chat Sidebar with Mobile Toggle */}
      <div className={`
        fixed inset-0 z-40 bg-background/95 backdrop-blur-xl transition-transform duration-300 transform
        md:relative md:translate-x-0 md:bg-transparent md:backdrop-blur-none md:z-0 md:block md:w-auto
        ${isMobileChatOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
          <ChatInterface onClose={() => setIsMobileChatOpen(false)} />
      </div>
      
    </div>
  );
}

export default App;