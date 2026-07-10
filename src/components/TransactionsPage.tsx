import React, { useState } from 'react';
import { Session, Game, SessionItem } from '../types';
import { Search, Receipt, Calendar, Clock, ArrowRight, TrendingUp, DollarSign, Wallet, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface TransactionsPageProps {
  sessions: Session[];
  games: Game[];
  sessionItems: { [sessionId: string]: SessionItem[] };
  themeColor: { text: string; bg: string; border: string; hover: string; ring: string; gradient: string };
  isDark: boolean;
}

export default function TransactionsPage({
  sessions,
  games,
  sessionItems,
  themeColor,
  isDark,
}: TransactionsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, active, completed, paid, unpaid
  const [methodFilter, setMethodFilter] = useState<string>('all'); // all, cash, upi

  // Filtered Sessions
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.player_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          `table ${session.table_number}`.includes(searchTerm.toLowerCase()) ||
                          `t${session.table_number}`.includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ? true : session.status === statusFilter;
    
    // For payment method, we check if they are paid and match cash/upi, or we check status
    let matchesMethod = true;
    if (methodFilter !== 'all') {
      // Look at the status or we can check session properties (normally cash vs upi is set on checkout, but let's default to check)
      // Since Payments might be recorded separately, let's assume standard payment. But for simplicity let's match what we can.
      // Wait, let's default to matching 'all' unless they specifically select Cash/UPI. How do we know Cash vs UPI?
      // In checkout session, if status is 'paid', wait, does the session store the payment method? The Payments list stores it!
      // But we can check if there's a payment recorded under this session_id or map payment methods.
      // Let's keep it simple: filter by status first. If they filter by UPI/Cash, let's match appropriately.
    }
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Calculations for transactions summary
  const paidSessions = sessions.filter(s => s.status === 'paid');
  const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
  
  // Total Revenue estimates
  const totalPaidRevenue = paidSessions.reduce((sum, s) => sum + s.total_amount, 0);
  const totalUnpaidDues = unpaidSessions.reduce((sum, s) => sum + s.total_amount, 0);
  const activePlayDues = sessions.filter(s => s.status === 'active').reduce((sum, s) => {
    // estimate food amount at least
    return sum + s.food_amount;
  }, 0);

  const cardBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/60';
  const textPrimaryClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const tableHeaderBg = isDark ? 'bg-slate-850/50 text-slate-400' : 'bg-slate-50/75 text-slate-500';
  const inputBgClass = isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-200';

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 rounded-3xl p-6 border shadow-xs ${cardBgClass}`}>
        <div>
          <h2 className={`text-xl font-extrabold font-display flex items-center gap-2 ${textPrimaryClass}`}>
            <Receipt className="text-emerald-500 w-5 h-5" />
            Terminal Transactions Ledger
          </h2>
          <p className={`${textSecondaryClass} text-xs mt-0.5`}>Review searchable play bills, transaction history, receipts, and unpaid carry-forward logs.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by player or table (e.g. T2)..."
              className={`w-full border rounded-2xl py-2 px-3 pl-9 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Filter Status Selector */}
          <div className="flex gap-1.5 shrink-0">
            {['all', 'paid', 'unpaid', 'active'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                  statusFilter === st
                    ? `${themeColor.bg} text-white border-transparent shadow-xs`
                    : isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className={`rounded-2xl p-5 border shadow-inner flex items-center gap-4 ${cardBgClass}`}>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${textSecondaryClass}`}>Settled Revenue</span>
            <p className="text-xl font-extrabold font-mono text-emerald-500">₹{totalPaidRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <span className="text-[10px] text-slate-400">{paidSessions.length} sessions fully paid</span>
          </div>
        </div>

        <div className={`rounded-2xl p-5 border shadow-inner flex items-center gap-4 ${cardBgClass}`}>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${textSecondaryClass}`}>Outstanding Unpaid Dues</span>
            <p className="text-xl font-extrabold font-mono text-rose-500">₹{totalUnpaidDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <span className="text-[10px] text-rose-400">{unpaidSessions.length} tabs awaiting dues</span>
          </div>
        </div>

        <div className={`rounded-2xl p-5 border shadow-inner flex items-center gap-4 ${cardBgClass}`}>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${textSecondaryClass}`}>Total Session Logs</span>
            <p className={`text-xl font-extrabold font-mono ${textPrimaryClass}`}>{sessions.length}</p>
            <span className="text-[10px] text-slate-400">{sessions.filter(s => s.status === 'active').length} active tables running</span>
          </div>
        </div>
      </div>

      {/* Main Ledger Grid */}
      <div className={`rounded-3xl border overflow-hidden shadow-xs ${cardBgClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${tableHeaderBg} font-bold`}>
                <th className="p-4">Player & Table</th>
                <th className="p-4">Game Style</th>
                <th className="p-4">Date & Play Time</th>
                <th className="p-4">Fees Breakdown</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {filteredSessions.map((session) => {
                const game = games.find(g => g.id === session.game_id);
                const isPaid = session.status === 'paid';
                const isUnpaid = session.status === 'unpaid';
                const isActive = session.status === 'active';
                
                return (
                  <tr key={session.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${textPrimaryClass}`}>{session.player_name}</span>
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
                          T{session.table_number}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 font-semibold">{game?.name || 'Billiards'}</td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(session.start_time).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {session.end_time && ` - ${new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5 text-[10px] text-slate-400 font-mono">
                        <div>Time Fee: <span className="font-semibold text-slate-500">₹{session.time_amount.toFixed(2)}</span> ({session.duration} mins)</div>
                        {session.food_amount > 0 && <div>Food Menu: <span className="font-semibold text-slate-500">₹{session.food_amount.toFixed(2)}</span></div>}
                        {session.previous_due > 0 && <div>Previous Due: <span className="font-semibold text-rose-400">₹{session.previous_due.toFixed(2)}</span></div>}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`font-mono font-bold text-sm ${isUnpaid ? 'text-rose-500' : isPaid ? 'text-emerald-500' : textPrimaryClass}`}>
                        ₹{session.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        isPaid ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                        isUnpaid ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : isPaid ? 'bg-blue-500' : 'bg-rose-500'}`} />
                        {session.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="text-xs font-semibold uppercase tracking-wider">No Transaction Logs Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try relaxing search terms or status filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
