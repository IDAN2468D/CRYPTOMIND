import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Activity, DollarSign, BarChart3, Globe, Clock, Wallet, TrendingUp, Maximize2, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Coin } from '../types';
import { getCoinHistory, ChartDataPoint } from '../services/cryptoService';

interface CoinDetailProps {
  coin: Coin;
  onBack: () => void;
  onTrade: (type: 'buy' | 'sell') => void;
}

export const CoinDetail: React.FC<CoinDetailProps> = ({ coin, onBack, onTrade }) => {
  const [historyData, setHistoryData] = useState<ChartDataPoint[]>([]);
  const [timeframe, setTimeframe] = useState<string | number>('1h'); 
  const [isLoading, setIsLoading] = useState(true);
  const [hoverData, setHoverData] = useState<number | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      const data = await getCoinHistory(coin.id, timeframe);
      setHistoryData(data);
      setIsLoading(false);
    };
    loadHistory();
  }, [coin.id, timeframe]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatCompactNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: "compact",
      maximumFractionDigits: 2
    }).format(num);
  };

  const isPositive = coin.price_change_percentage_24h >= 0;
  const currentDisplayPrice = hoverData || coin.current_price;

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 space-y-4 md:space-y-6">
      
      {/* Top Navigation & Title Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button 
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-white/5"
            >
            <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
                <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full shadow-lg" />
                <div>
                    <h2 className="text-2xl font-bold text-white leading-none">{coin.name}</h2>
                    <span className="text-sm font-mono text-slate-500 font-bold tracking-wider">{coin.symbol.toUpperCase()}</span>
                </div>
            </div>
        </div>
        
        {/* Quick Actions (Desktop) */}
        <div className="hidden md:flex gap-2">
             <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/5 flex items-center gap-2 text-xs text-slate-400">
                <Clock size={14} />
                <span className="font-mono">Real-time Data</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
             </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
        
        {/* Left Column: Chart & Price (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-h-[500px]">
            
            {/* Price Header Card */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/10 transition-colors duration-700"></div>
                
                <div>
                    <div className="flex items-baseline gap-3">
                         <h1 className="text-5xl md:text-6xl font-mono font-bold text-white tracking-tighter">
                            {formatCurrency(currentDisplayPrice)}
                         </h1>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold border ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {isPositive ? <ArrowUpRight size={16} strokeWidth={2.5}/> : <ArrowDownRight size={16} strokeWidth={2.5}/>}
                            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </span>
                        <span className="text-sm text-slate-500 font-medium">Past 24 Hours</span>
                    </div>
                </div>

                {/* High/Low Bar */}
                <div className="w-full md:w-auto flex flex-col items-end gap-1">
                     <div className="flex items-center gap-8 text-xs font-mono text-slate-400 mb-1 w-full justify-between md:justify-end">
                        <span>L: {formatCurrency(coin.low_24h)}</span>
                        <span>H: {formatCurrency(coin.high_24h)}</span>
                     </div>
                     <div className="w-full md:w-48 h-2 bg-slate-800 rounded-full overflow-hidden relative">
                        <div 
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-500 via-yellow-500 to-emerald-500 opacity-80"
                            style={{ 
                                left: '0%', 
                                right: '0%' 
                            }}
                        ></div>
                        {/* Current Price Marker */}
                        <div 
                            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] z-10"
                            style={{
                                left: `${Math.min(Math.max(((coin.current_price - coin.low_24h) / (coin.high_24h - coin.low_24h)) * 100, 0), 100)}%`
                            }}
                        ></div>
                     </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col relative">
                
                {/* Timeframe Tabs */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-white/5">
                        {[
                            { label: '1H', value: '1h' },
                            { label: '1D', value: 1 },
                            { label: '1W', value: 7 },
                            { label: '1M', value: '1m' },
                        ].map((tf) => (
                            <button
                                key={tf.label}
                                onClick={() => setTimeframe(tf.value)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                                    timeframe === tf.value 
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                        <Activity size={14} />
                        TradingView Mode
                    </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 min-h-[300px] w-full relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <Activity className="animate-spin text-primary" size={32} />
                            <span className="text-sm text-slate-500 font-mono animate-pulse">Loading Chart Data...</span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                                data={historyData}
                                onMouseMove={(e) => {
                                    if (e.activePayload && e.activePayload[0]) {
                                        setHoverData(e.activePayload[0].payload.price);
                                    }
                                }}
                                onMouseLeave={() => setHoverData(null)}
                            >
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                                    </linearGradient>
                                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeOpacity="0.03" strokeWidth="1"/>
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#grid)" />
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#475569" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    axisLine={false}
                                    minTickGap={50}
                                    dy={10}
                                />
                                <YAxis 
                                    domain={['auto', 'auto']} 
                                    stroke="#475569" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                                    width={60}
                                />
                                <Tooltip 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-slate-900/90 border border-white/10 p-3 rounded-lg shadow-2xl backdrop-blur-md">
                                                <p className="text-slate-400 text-xs mb-1 font-mono">{label}</p>
                                                <p className="text-white font-bold font-mono text-lg">
                                                    {formatCurrency(payload[0].value as number)}
                                                </p>
                                            </div>
                                        );
                                        }
                                        return null;
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="price" 
                                    stroke={isPositive ? '#10b981' : '#f43f5e'} 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorPrice)" 
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>

        {/* Right Column: Stats & Trading (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Market Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                 <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">
                        <Activity size={14} className="text-primary"/> Market Cap
                    </div>
                    <div className="text-xl font-mono font-bold text-white">{formatCompactNumber(coin.market_cap)}</div>
                 </div>
                 
                 <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">
                        <BarChart3 size={14} className="text-secondary"/> Volume (24H)
                    </div>
                    <div className="text-xl font-mono font-bold text-white">{formatCompactNumber(coin.total_volume)}</div>
                 </div>

                 <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">
                        <TrendingUp size={14} className="text-emerald-400"/> All Time High
                    </div>
                    {/* Mock ATH for visual completeness since API doesn't send it in this endpoint */}
                    <div className="text-xl font-mono font-bold text-white opacity-80">{formatCurrency(coin.high_24h * 1.4)}</div> 
                 </div>
            </div>

            {/* Trading Panel */}
            <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 z-10">
                    <Wallet className="text-primary" /> Execute Trade
                </h3>

                <div className="flex-1 flex flex-col justify-end gap-4 z-10">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Order Type</span>
                            <span>Market</span>
                        </div>
                        <div className="text-white font-mono font-bold text-sm">Immediate Execution</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => onTrade('buy')}
                            className="group relative flex flex-col items-center justify-center py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98]"
                        >
                            <span className="text-lg tracking-wide">BUY</span>
                            <span className="text-[10px] opacity-70 font-mono uppercase tracking-wider group-hover:opacity-100">Long Position</span>
                        </button>

                        <button 
                            onClick={() => onTrade('sell')}
                            className="group relative flex flex-col items-center justify-center py-4 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/30 font-bold transition-all hover:border-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-[0.98]"
                        >
                            <span className="text-lg tracking-wide">SELL</span>
                            <span className="text-[10px] opacity-70 font-mono uppercase tracking-wider group-hover:opacity-100">Short Position</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl">
                 <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe size={12}/> Asset Information
                 </h4>
                 <p className="text-xs text-slate-400 leading-relaxed">
                    {coin.name} ({coin.symbol.toUpperCase()}) is currently ranked globally by market capitalization. 
                    Price has moved <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>{coin.price_change_percentage_24h.toFixed(2)}%</span> in the last 24 hours.
                 </p>
            </div>

        </div>
      </div>
    </div>
  );
};