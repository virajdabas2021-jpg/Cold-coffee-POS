import React, { useState } from 'react';
import { Session, Game } from '../types';
import { Calendar, TrendingUp, BarChart3, Award, Flame, Star, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SalesRecordProps {
  sessions: Session[];
  games: Game[];
  themeColor: { text: string; bg: string; border: string; hover: string; ring: string; gradient: string };
  isDark: boolean;
}

export default function SalesRecord({
  sessions,
  games,
  themeColor,
  isDark,
}: SalesRecordProps) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Get completed sessions with status = 'paid'
  const paidSessions = sessions.filter(s => s.status === 'paid');

  // Utility to parse dates relative to now
  const now = new Date();
  const getDaysAgoDate = (days: number) => {
    const d = new Date();
    d.setDate(now.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // 1. Weekly Sales (Last 7 days, Monday to Sunday or trailing 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = getDaysAgoDate(6 - i);
    const dayLabel = date.toLocaleDateString([], { weekday: 'short' });
    const fullDateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    
    // Filter sessions matching this calendar day
    const daySessions = paidSessions.filter(s => {
      if (!s.end_time) return false;
      const sDate = new Date(s.end_time);
      return sDate.getFullYear() === date.getFullYear() &&
             sDate.getMonth() === date.getMonth() &&
             sDate.getDate() === date.getDate();
    });
    
    const salesAmount = daySessions.reduce((sum, s) => sum + s.total_amount, 0);
    return { label: dayLabel, dateStr: fullDateStr, amount: salesAmount, count: daySessions.length };
  });

  // 2. Monthly Sales (Last 30 days split into 5-day intervals)
  const last30Days = Array.from({ length: 6 }).map((_, i) => {
    const startDaysAgo = 29 - i * 5;
    const endDaysAgo = 29 - (i + 1) * 5 + 1;
    
    const startDate = getDaysAgoDate(startDaysAgo);
    const endDate = getDaysAgoDate(Math.max(0, endDaysAgo));
    
    const label = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;
    
    const rangeSessions = paidSessions.filter(s => {
      if (!s.end_time) return false;
      const sTime = new Date(s.end_time).getTime();
      return sTime >= startDate.getTime() && sTime <= (endDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    });
    
    const salesAmount = rangeSessions.reduce((sum, s) => sum + s.total_amount, 0);
    return { label, dateStr: `Interval Block ${i + 1}`, amount: salesAmount, count: rangeSessions.length };
  });

  // 3. Yearly Sales (Last 12 months)
  const last12Months = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date();
    date.setMonth(now.getMonth() - (11 - i));
    const monthLabel = date.toLocaleDateString([], { month: 'short' });
    const yearLabel = date.getFullYear();
    
    const monthSessions = paidSessions.filter(s => {
      if (!s.end_time) return false;
      const sDate = new Date(s.end_time);
      return sDate.getFullYear() === date.getFullYear() && sDate.getMonth() === date.getMonth();
    });
    
    const salesAmount = monthSessions.reduce((sum, s) => sum + s.total_amount, 0);
    return { label: monthLabel, dateStr: `${monthLabel} ${yearLabel}`, amount: salesAmount, count: monthSessions.length };
  });

  // Decide current dataset
  const currentData = timeframe === 'weekly' ? last7Days : timeframe === 'monthly' ? last30Days : last12Months;

  // Compute stats
  const totalWeeklySales = last7Days.reduce((sum, d) => sum + d.amount, 0);
  const totalMonthlySales = last30Days.reduce((sum, d) => sum + d.amount, 0);
  const totalYearlySales = last12Months.reduce((sum, d) => sum + d.amount, 0);

  // Find max value for chart scaling
  const maxAmount = Math.max(...currentData.map(d => d.amount), 500);

  // Theme support
  const cardBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/60';
  const textPrimaryClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-3xl p-6 border shadow-xs ${cardBgClass}`}>
        <div>
          <h2 className={`text-xl font-extrabold font-display flex items-center gap-2 ${textPrimaryClass}`}>
            <BarChart3 className="text-emerald-500 w-5 h-5" />
            Performance & Sales Analytics
          </h2>
          <p className={`${textSecondaryClass} text-xs mt-0.5`}>Monitor billiard table sales performance, revenue peaks, and periodic trend lines.</p>
        </div>

        {/* Timeframe Toggles */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shrink-0">
          {(['weekly', 'monthly', 'yearly'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf);
                setHoveredBarIndex(null);
              }}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                timeframe === tf
                  ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Weekly Stats Card */}
        <div className={`rounded-2xl p-5 border shadow-inner flex flex-col justify-between ${cardBgClass}`}>
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${textSecondaryClass}`}>Trailing 7 Days</span>
              <p className="text-2xl font-extrabold font-mono text-emerald-500 mt-1">₹{totalWeeklySales.toLocaleString('en-IN')}</p>
            </div>
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100/30">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg ₹{(totalWeeklySales / 7).toFixed(1)} / day sales</span>
          </div>
        </div>

        {/* Monthly Stats Card */}
        <div className={`rounded-2xl p-5 border shadow-inner flex flex-col justify-between ${cardBgClass}`}>
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${textSecondaryClass}`}>Trailing 30 Days</span>
              <p className={`text-2xl font-extrabold font-mono ${textPrimaryClass} mt-1`}>₹{totalMonthlySales.toLocaleString('en-IN')}</p>
            </div>
            <span className="p-2 bg-slate-100 dark:bg-slate-800 text-indigo-500 rounded-lg">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100/30">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg ₹{(totalMonthlySales / 30).toFixed(1)} / day sales</span>
          </div>
        </div>

        {/* Yearly Stats Card */}
        <div className={`rounded-2xl p-5 border shadow-inner flex flex-col justify-between ${cardBgClass}`}>
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${textSecondaryClass}`}>Trailing 12 Months</span>
              <p className="text-2xl font-extrabold font-mono text-indigo-500 mt-1">₹{totalYearlySales.toLocaleString('en-IN')}</p>
            </div>
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-lg">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100/30">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Avg ₹{(totalYearlySales / 12).toFixed(1)} / month sales</span>
          </div>
        </div>
      </div>

      {/* Vector Interactive SVG Chart */}
      <div className={`rounded-3xl border p-6 ${cardBgClass}`}>
        <h3 className={`font-bold font-display text-sm mb-6 flex items-center gap-2 ${textPrimaryClass}`}>
          <Star className="w-4 h-4 text-amber-500" />
          Revenue trend ({timeframe.toUpperCase()})
        </h3>

        {/* Responsive Vector SVG Box wrapper */}
        <div className="relative w-full h-80">
          <svg className="w-full h-full" viewBox="0 0 700 300" preserveAspectRatio="none">
            {/* Horizontal Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
              const y = 250 - p * 200;
              const val = (p * maxAmount).toFixed(0);
              return (
                <g key={i} className="opacity-25 dark:opacity-10">
                  <line 
                    x1="60" 
                    y1={y} 
                    x2="680" 
                    y2={y} 
                    stroke={isDark ? '#94a3b8' : '#475569'} 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                  <text 
                    x="10" 
                    y={y + 4} 
                    fill={isDark ? '#94a3b8' : '#475569'} 
                    fontSize="10" 
                    fontFamily="monospace"
                  >
                    ₹{val}
                  </text>
                </g>
              );
            })}

            {/* Vertical Bars / Columns */}
            {currentData.map((d, idx) => {
              const width = 600 / currentData.length;
              const barWidth = Math.max(16, width * 0.5);
              const x = 70 + idx * width + (width - barWidth) / 2;
              
              const barHeight = maxAmount > 0 ? (d.amount / maxAmount) * 200 : 0;
              const y = 250 - barHeight;
              const isHovered = hoveredBarIndex === idx;

              return (
                <g 
                  key={idx} 
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  {/* Glowing neon hover effect */}
                  {isHovered && (
                    <rect
                      x={x - 4}
                      y={y - 4}
                      width={barWidth + 8}
                      height={barHeight + 8}
                      rx="8"
                      fill={themeColor.bg.replace('bg-', 'text-')}
                      className="opacity-15 animate-pulse"
                    />
                  )}

                  {/* Main solid bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    className={`${themeColor.bg} transition-all duration-300`}
                    opacity={isHovered ? 1 : 0.85}
                  />

                  {/* Subtle Top cap light highlight */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height="4"
                    rx="2"
                    fill="#ffffff"
                    className="opacity-30"
                  />

                  {/* Bottom Floor marker */}
                  <circle
                    cx={x + barWidth / 2}
                    cy="250"
                    r="3"
                    className={`${themeColor.bg.replace('bg-', 'fill-')}`}
                    opacity={isHovered ? 1 : 0.4}
                  />
                </g>
              );
            })}

            {/* Horizontal timeline bottom coordinate ruler line */}
            <line 
              x1="60" 
              y1="250" 
              x2="680" 
              y2="250" 
              stroke={isDark ? '#475569' : '#cbd5e1'} 
              strokeWidth="1.5" 
            />

            {/* X Axis labels */}
            {currentData.map((d, idx) => {
              const width = 600 / currentData.length;
              const x = 70 + idx * width + width / 2;
              return (
                <text
                  key={idx}
                  x={x}
                  y="272"
                  textAnchor="middle"
                  fill={isDark ? '#94a3b8' : '#64748b'}
                  fontSize="11"
                  fontWeight="bold"
                >
                  {d.label}
                </text>
              );
            })}
          </svg>

          {/* Dynamic Popup Hover Tooltip overlay details */}
          {hoveredBarIndex !== null && (
            <div 
              className="absolute bg-[#0f172a] text-white p-3.5 rounded-2xl border border-slate-700 shadow-xl space-y-1 z-10 animate-in fade-in zoom-in-95"
              style={{
                left: `${Math.min(80, 5 + (hoveredBarIndex / currentData.length) * 85)}%`,
                top: '20px',
              }}
            >
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {currentData[hoveredBarIndex].dateStr}
              </div>
              <div className="font-mono text-sm font-extrabold text-emerald-400">
                ₹{currentData[hoveredBarIndex].amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-300">
                {currentData[hoveredBarIndex].count} bill transactions settled
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
