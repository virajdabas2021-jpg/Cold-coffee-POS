import React from 'react';
import { PlayCircle, CheckCircle, AlertTriangle, IndianRupee, Clock, TrendingUp, Users } from 'lucide-react';
import { Session, Game } from '../types';

interface DashboardProps {
  sessions: Session[];
  games: Game[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  themeColor: { text: string; bg: string; border: string; gradient: string };
  isDark?: boolean;
}

export default function Dashboard({ sessions, games, activeTab, setActiveTab, themeColor, isDark = false }: DashboardProps) {
  // Filter for today's sessions only
  const getTodaySessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessions.filter(s => new Date(s.start_time) >= today);
  };

  const todaySessions = getTodaySessions();

  // Metrics
  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessionsToday = todaySessions.filter(s => s.status === 'completed' || s.status === 'paid' || s.status === 'unpaid');
  
  // Total Sales today = sum of (time_amount + food_amount) for all completed today
  const totalSalesToday = completedSessionsToday.reduce((sum, s) => sum + s.time_amount + s.food_amount, 0);
  
  // Total Unpaid Dues = sum of total_amount for all 'unpaid' sessions (all time, since unpaid dues are carried over, but we can show all-time unpaid or today unpaid. Let's show all-time unpaid which is more useful, or specifically show both!)
  const allUnpaidSessions = sessions.filter(s => s.status === 'unpaid');
  const totalUnpaidDues = allUnpaidSessions.reduce((sum, s) => sum + s.total_amount, 0);

  // Payments collected today
  const paidSessionsToday = todaySessions.filter(s => s.status === 'paid');
  const paymentsCollectedToday = paidSessionsToday.reduce((sum, s) => sum + s.total_amount, 0);

  // Table utilisation rate
  const totalTablesCount = games.reduce((sum, g) => sum + g.table_count, 0);
  const activeTablesCount = activeSessions.length;
  const utilizationRate = totalTablesCount > 0 ? Math.round((activeTablesCount / totalTablesCount) * 100) : 0;

  // Breakdown of games
  const gameStats = games.map(g => {
    const activeForGame = activeSessions.filter(s => s.game_id === g.id).length;
    const completedTodayForGame = todaySessions.filter(s => s.game_id === g.id && s.status !== 'active').length;
    return {
      name: g.name,
      active: activeForGame,
      completed: completedTodayForGame,
      total: g.table_count
    };
  });

  const cardBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/60';
  const innerCardBgClass = isDark ? 'bg-[#0f172a] border-slate-800/50' : 'bg-slate-50 border-slate-100';
  const textPrimaryClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div id="dashboard-tab" className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Banner Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border rounded-2xl p-6 shadow-xs relative overflow-hidden ${cardBgClass}`}>
        <div>
          <h2 className={`text-xl font-extrabold tracking-tight ${textPrimaryClass}`}>Daily Dashboard Overview</h2>
          <p className={`${textSecondaryClass} text-xs mt-1`}>Real-time terminal summary for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 rounded-full px-3 py-1">
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 font-mono tracking-wider">LIVE TERMINAL MONITOR</span>
        </div>
      </div>

      {/* Main Grid Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Sales */}
        <div className={`rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all flex items-start justify-between ${cardBgClass}`}>
          <div className="space-y-2">
            <span className={`${textSecondaryClass} text-xs font-semibold uppercase tracking-wider block`}>Today's Sales</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold font-mono ${textPrimaryClass}`}>₹{totalSalesToday.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${textSecondaryClass}`}>
              <span className="font-medium text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                ₹{paymentsCollectedToday.toLocaleString('en-IN')}
              </span>
              <span>collected directly</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-2xl">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Active Sessions */}
        <button 
          onClick={() => setActiveTab('sessions')}
          className={`rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all flex items-start justify-between text-left cursor-pointer ${cardBgClass}`}
        >
          <div className="space-y-2">
            <span className={`${textSecondaryClass} text-xs font-semibold uppercase tracking-wider block`}>Active Sessions</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono ${textPrimaryClass}`}>{activeSessions.length}</span>
              <span className={`text-xs font-medium ${textSecondaryClass}`}>tables running</span>
            </div>
            <div className="w-28 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full ${themeColor.bg}`} 
                style={{ width: `${Math.min(100, utilizationRate)}%` }}
              />
            </div>
            <span className={`text-[10px] ${textSecondaryClass} block font-medium uppercase tracking-wide`}>
              {utilizationRate}% table utilization
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-700 rounded-2xl">
            <PlayCircle className="w-6 h-6 text-emerald-500 animate-pulse" />
          </div>
        </button>

        {/* Metric 3: Completed Sessions */}
        <div className={`rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all flex items-start justify-between ${cardBgClass}`}>
          <div className="space-y-2">
            <span className={`${textSecondaryClass} text-xs font-semibold uppercase tracking-wider block`}>Completed Today</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono ${textPrimaryClass}`}>{completedSessionsToday.length}</span>
              <span className={`text-xs font-medium ${textSecondaryClass}`}>sessions total</span>
            </div>
            <span className={`text-xs ${textSecondaryClass} flex items-center gap-1`}>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{todaySessions.filter(s => s.status === 'paid').length} marked fully paid</span>
            </span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Total Unpaid Amount */}
        <button 
          onClick={() => setActiveTab('unpaid')}
          className={`rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all flex items-start justify-between text-left cursor-pointer ${cardBgClass}`}
        >
          <div className="space-y-2">
            <span className={`${textSecondaryClass} text-xs font-semibold uppercase tracking-wider block`}>Total Unpaid Dues</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold font-mono text-rose-600">₹{totalUnpaidDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <span className="text-xs text-rose-500 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
              <span>{allUnpaidSessions.length} sessions awaiting dues</span>
            </span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* Grid of Tables and Today's Log */}
      <div className="grid grid-cols-1 gap-6">
        {/* Game and Table Status Details */}
        <div className={`rounded-3xl p-6 border shadow-xs space-y-4 ${cardBgClass}`}>
          <div className="flex justify-between items-center pb-3 border-b border-slate-100/30">
            <h3 className={`font-display font-bold flex items-center gap-2 ${textPrimaryClass}`}>
              <Users className="w-5 h-5 text-slate-500" />
              Table Utilization Breakdown
            </h3>
            <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full">
              {activeTablesCount} / {totalTablesCount} tables active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameStats.map((stat, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border space-y-3.5 ${innerCardBgClass}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className={`font-semibold text-sm ${textPrimaryClass}`}>{stat.name}</h4>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Capacity: {stat.total} Tables</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stat.active > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                    {stat.active} Active
                  </span>
                </div>

                {/* Progress Visual Table Indicators */}
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {Array.from({ length: stat.total }).map((_, tableIdx) => {
                      const tableNo = tableIdx + 1;
                      const isActive = sessions.some(s => s.game_id === games.find(g => g.name === stat.name)?.id && s.table_number === tableNo && s.status === 'active');
                      return (
                        <div 
                          key={tableNo} 
                          title={`Table ${tableNo}: ${isActive ? 'Occupied' : 'Vacant'}`}
                          className={`h-4 flex-1 rounded ${isActive ? `${themeColor.bg} felt-active` : 'bg-slate-200 dark:bg-slate-700'}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Table 1</span>
                    <span>Table {stat.total}</span>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-200/50">
                  <span>Completed Today:</span>
                  <span className="font-semibold font-mono text-slate-600 dark:text-slate-300">{stat.completed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
