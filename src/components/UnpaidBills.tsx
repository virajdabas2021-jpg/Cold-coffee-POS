import React, { useState } from 'react';
import { Session, Game, SessionItem, PaymentMethod } from '../types';
import { AlertCircle, IndianRupee, Search, CheckCircle, Calendar, Clock, ShoppingCart, UserCheck, ChevronDown, ChevronUp, Check, Smartphone, QrCode } from 'lucide-react';

interface UnpaidBillsProps {
  sessions: Session[];
  games: Game[];
  sessionItems: { [sessionId: string]: SessionItem[] };
  qrCodeUrl: string;
  onSettleDues: (sessionId: string, method: PaymentMethod) => Promise<void>;
  themeColor: { text: string; bg: string; border: string; hover: string; ring: string; gradient: string };
  isDark?: boolean;
}

export default function UnpaidBills({
  sessions,
  games,
  sessionItems,
  qrCodeUrl,
  onSettleDues,
  themeColor,
  isDark = false,
}: UnpaidBillsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  
  // Settle dues state
  const [settlingSession, setSettlingSession] = useState<Session | null>(null);
  const [settlingMethod, setSettlingMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Filter sessions that have status 'unpaid'
  const unpaidSessions = sessions.filter(
    s => s.status === 'unpaid' && s.player_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (sessionId: string) => {
    setExpandedSessionId(prev => (prev === sessionId ? null : sessionId));
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingSession) return;

    setIsProcessing(true);
    try {
      await onSettleDues(settlingSession.id, settlingMethod);
      setSettlingSession(null);
      setShowQr(false);
    } catch (err) {
      console.error('Failed to settle unpaid dues:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate UPI QR link for settling dues
  const getUpiQrCodeUrl = (amount: number) => {
    if (qrCodeUrl) return qrCodeUrl;
    
    const payeeAddress = 'billiardscafe@upi';
    const payeeName = encodeURIComponent('Billiard Café POS');
    const amountStr = amount.toFixed(2);
    const upiLink = `upi://pay?pa=${payeeAddress}&pn=${payeeName}&am=${amountStr}&cu=INR`;
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;
  };

  // Theme styling definitions
  const cardBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/60';
  const textPrimaryClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBgClass = isDark ? 'bg-[#0f172a] border-slate-700 text-white font-medium' : 'bg-slate-50 border-slate-200/80 text-slate-900';
  const modalBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-100';

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-3xl p-5 border shadow-xs ${cardBgClass}`}>
        <div>
          <h2 className={`text-xl font-extrabold font-display flex items-center gap-2 ${textPrimaryClass}`}>
            <AlertCircle className="text-rose-500 w-5 h-5" />
            Outstanding Unpaid Bills History
          </h2>
          <p className={`${textSecondaryClass} text-xs mt-0.5`}>Track, search, and settle players with accumulated unpaid tabs.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by player name..."
            className={`w-full border rounded-2xl py-2 px-3 pl-9 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBgClass}`}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Dues List */}
      <div className="space-y-4">
        {unpaidSessions.map((session) => {
          const game = games.find(g => g.id === session.game_id);
          const items = sessionItems[session.id] || [];
          const isExpanded = expandedSessionId === session.id;

          return (
            <div
              key={session.id}
              className={`rounded-3xl border shadow-xs overflow-hidden transition-all duration-150 ${cardBgClass}`}
            >
              {/* Header card view */}
              <div 
                onClick={() => toggleExpand(session.id)}
                className={`p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer ${isDark ? 'hover:bg-slate-800/10' : 'hover:bg-slate-50/50'}`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-2xl shrink-0">
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-extrabold text-base ${textPrimaryClass}`}>{session.player_name}</h3>
                      <span className="text-[10px] bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-mono font-bold px-2 py-0.5 rounded-full">
                        UNPAID DUES
                      </span>
                    </div>
                    <div className={`text-xs flex flex-wrap items-center gap-1.5 ${textSecondaryClass}`}>
                      <span>Table #{session.table_number}</span>
                      <span>•</span>
                      <span>{game?.name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.start_time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Owed Amount</span>
                    <span className="text-lg font-black font-mono text-rose-600">
                      ₹{session.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettlingSession(session);
                        setSettlingMethod('cash');
                      }}
                      className="py-2 px-4 rounded-xl text-white bg-rose-600 hover:bg-rose-500 hover:shadow-md active:scale-95 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Settle Balance
                    </button>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>
              </div>

              {/* Expand Details (Itemised Billing) */}
              {isExpanded && (
                <div className={`px-5 pb-5 pt-2 border-t divide-y text-xs animate-in slide-in-from-top-1 ${isDark ? 'border-slate-800 bg-slate-800/10 divide-slate-800/60' : 'border-slate-100 bg-slate-50/40 divide-slate-100/60'}`}>
                  <div className={`py-3 flex justify-between items-center ${textSecondaryClass}`}>
                    <div>
                      <span className={`font-bold block ${textPrimaryClass}`}>Table Felt Duration Charge</span>
                      <span className="text-[10px] text-slate-400">{session.duration} mins played ({new Date(session.start_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} to {session.end_time ? new Date(session.end_time).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}) : 'Now'})</span>
                    </div>
                    <span className={`font-bold font-mono ${textPrimaryClass}`}>₹{session.time_amount.toFixed(2)}</span>
                  </div>

                  {items.map((item) => (
                    <div key={item.id} className={`py-3 flex justify-between items-center ${textSecondaryClass}`}>
                      <div>
                        <span className={`font-bold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.item_name}</span>
                        <span className="text-[10px] text-slate-400">₹{item.price} × {item.quantity}</span>
                      </div>
                      <span className={`font-bold font-mono ${textPrimaryClass}`}>₹{item.total.toFixed(2)}</span>
                    </div>
                  ))}

                  {session.previous_due > 0 && (
                    <div className="py-3 flex justify-between items-center text-rose-700 dark:text-rose-400 font-medium">
                      <span className="font-bold block">Previous Unpaid carry-forward</span>
                      <span className="font-bold font-mono">₹{session.previous_due.toFixed(2)}</span>
                    </div>
                  )}

                  <div className={`py-3.5 flex justify-between items-center font-bold border-t border-dashed ${isDark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'}`}>
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">Total Consolidated Tab Dues</span>
                    <span className="text-base font-extrabold font-mono text-rose-600">
                      ₹{session.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {unpaidSessions.length === 0 && (
          <div className={`rounded-3xl p-16 border text-center space-y-3.5 ${cardBgClass}`}>
            <div className={`inline-flex p-5 rounded-full text-emerald-600 border ${isDark ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100'}`}>
              <Check className="w-8 h-8" />
            </div>
            <div>
              <h3 className={`text-base font-extrabold font-display ${textPrimaryClass}`}>Clean Slate! No Unpaid Tabs</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                No outstanding customer balances were found. All finished tables have been settled fully with Cash or UPI transfer. Perfect bookkeeping!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Settle Balance Dialog Modal */}
      {settlingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className={`${modalBgClass} rounded-3xl p-6 w-full max-w-md shadow-2xl border space-y-5 animate-in fade-in zoom-in-95 duration-150`}>
            <div className={`flex justify-between items-center pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className={`text-base font-bold font-display flex items-center gap-1.5 ${textPrimaryClass}`}>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Settle Customer Tab
              </h3>
              <button 
                onClick={() => {
                  setSettlingSession(null);
                  setShowQr(false);
                }}
                className={`text-slate-400 hover:text-slate-200 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-850' : 'bg-slate-100'}`}
              >
                ✕
              </button>
            </div>

            <div className={`p-4 border rounded-2xl flex justify-between items-center text-xs ${isDark ? 'bg-rose-950/10 border-rose-900/30 font-bold' : 'bg-rose-50 border-rose-100'}`}>
              <div>
                <span className={`font-bold block ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Settle Dues for</span>
                <span className={`text-sm font-black ${textPrimaryClass}`}>{settlingSession.player_name}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider block">Owed Total</span>
                <span className="text-lg font-black font-mono text-rose-600">₹{settlingSession.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Choose Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSettlingMethod('cash');
                      setShowQr(false);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                      settlingMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 font-bold ring-1 ring-emerald-500'
                        : isDark 
                          ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-750 text-slate-300'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <IndianRupee className="w-4 h-4 text-slate-500" />
                    <span className="text-xs">Settle Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSettlingMethod('upi');
                      setShowQr(true);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                      settlingMethod === 'upi'
                        ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 font-bold ring-1 ring-emerald-500'
                        : isDark 
                          ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-750 text-slate-300'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    <span className="text-xs">Settle UPI QR</span>
                  </button>
                </div>
              </div>

              {/* Embedded QR code scan terminal */}
              {showQr && (
                <div className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1.5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Scan to settle ₹{settlingSession.total_amount}</span>
                  <div className="p-1 bg-white rounded-lg border border-slate-200">
                    <img
                      src={getUpiQrCodeUrl(settlingSession.total_amount)}
                      alt="Settle UPI QR"
                      referrerPolicy="no-referrer"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium">Verify credit on your scanner device before submitting.</p>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettlingSession(null);
                    setShowQr(false);
                  }}
                  className={`flex-1 py-3 font-semibold text-xs rounded-xl transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 py-3 text-white ${themeColor.bg} ${themeColor.hover} font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer disabled:bg-slate-300`}
                >
                  {isProcessing ? 'Saving Settlement...' : 'Confirm Paid & Close Tab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
