import React, { useState } from 'react';
import { IndianRupee, Printer, ArrowRight, CheckCircle, Clock, AlertTriangle, AlertCircle, Smartphone, QrCode } from 'lucide-react';
import { Session, Game, SessionItem, PaymentMethod } from '../types';

interface BillingModalProps {
  session: Session | null;
  games: Game[];
  items: SessionItem[];
  qrCodeUrl: string;
  onConfirmPayment: (sessionId: string, method: PaymentMethod | 'unpaid') => Promise<void>;
  onClose: () => void;
  themeColor: { text: string; bg: string; border: string; hover: string; ring: string; gradient: string };
  isDark?: boolean;
}

export default function BillingModal({
  session,
  games,
  items,
  qrCodeUrl,
  onConfirmPayment,
  onClose,
  themeColor,
  isDark = false,
}: BillingModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'unpaid'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQrFullscreen, setShowQrFullscreen] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  if (!session) return null;

  const game = games.find(g => g.id === session.game_id);
  const foodTotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = session.time_amount + foodTotal + session.previous_due;

  const handleCompleteBilling = async () => {
    setIsProcessing(true);
    try {
      await onConfirmPayment(session.id, paymentMethod);
      if (paymentMethod === 'unpaid') {
        onClose();
      } else {
        setIsSettled(true);
      }
    } catch (e) {
      console.error('Billing failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate dynamic backup UPI QR code if admin has not uploaded a QR code image
  const getUpiQrCodeUrl = () => {
    if (qrCodeUrl) return qrCodeUrl;
    
    const payeeAddress = 'billiardscafe@upi';
    const payeeName = encodeURIComponent('Billiard Café POS');
    const amountStr = totalAmount.toFixed(2);
    const upiLink = `upi://pay?pa=${payeeAddress}&pn=${payeeName}&am=${amountStr}&cu=INR`;
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;
  };

  const modalBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-100';
  const leftPanelBgClass = isDark ? 'bg-[#0f172a] border-slate-800/40' : 'bg-white border-slate-100';
  const rightPanelBgClass = isDark ? 'bg-[#121b2e] border-slate-800/50' : 'bg-slate-50 border-slate-100';
  const textPrimaryClass = isDark ? 'text-white' : 'text-slate-950';
  const textSecondaryClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const itemBgClass = isDark ? 'bg-slate-800/40 border-slate-850' : 'bg-slate-50/50 border-slate-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      
      {/* Dynamic Layout: Single compact column before settlement, split-view after settlement */}
      {!isSettled ? (
        /* STAGE 1: BEFORE SETTLEMENT (Compact single column - no print option, no layout clipping) */
        <div className={`rounded-3xl w-full max-w-md shadow-2xl border p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 ${modalBgClass}`}>
          {/* Header */}
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100/30">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">CHECKOUT PORTAL</span>
              <h3 className={`text-base font-extrabold font-display mt-0.5 ${textPrimaryClass}`}>
                Settle Table #{session.table_number}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className={`text-slate-400 hover:text-slate-200 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
            >
              ✕
            </button>
          </div>

          {/* Quick Info card */}
          <div className={`p-3.5 rounded-2xl border text-xs flex justify-between items-center ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
            <div>
              <span className={textSecondaryClass}>Player Name</span>
              <p className={`font-bold text-sm ${textPrimaryClass}`}>{session.player_name || 'Guest'}</p>
            </div>
            <div className="text-right">
              <span className={textSecondaryClass}>Duration played</span>
              <p className={`font-bold text-sm flex items-center justify-end gap-1 ${textPrimaryClass}`}>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {session.duration} mins
              </p>
            </div>
          </div>

          {/* Large total display */}
          <div className={`p-4 rounded-2xl text-center border-2 ${themeColor.border} bg-slate-50 dark:bg-slate-900/40`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">GRAND BILL DUES</span>
            <span className={`text-3xl font-extrabold font-mono mt-1 block ${themeColor.text}`}>
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            
            {/* Small simple breakdowns list */}
            <div className="mt-3 pt-3 border-t border-slate-200/40 dark:border-slate-800 text-[10px] space-y-1 text-left">
              <div className="flex justify-between text-slate-400">
                <span>• Table session play:</span>
                <span className={`font-mono ${textPrimaryClass}`}>₹{session.time_amount.toFixed(2)}</span>
              </div>
              {foodTotal > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>• Drinks & snacks bill:</span>
                  <span className={`font-mono ${textPrimaryClass}`}>₹{foodTotal.toFixed(2)}</span>
                </div>
              )}
              {session.previous_due > 0 && (
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>• Previous unpaid dues:</span>
                  <span className="font-mono">₹{session.previous_due.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Select Settlement Mode</span>
            
            <div className="space-y-1.5">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? `${themeColor.border} bg-white dark:bg-slate-800 shadow-sm ring-2 ring-offset-1 ${themeColor.ring}`
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${paymentMethod === 'cash' ? themeColor.bg + ' text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className={`font-bold text-xs block ${textPrimaryClass}`}>Settle Cash</span>
                  </div>
                </div>
                {paymentMethod === 'cash' && (
                  <CheckCircle className={`w-3.5 h-3.5 ${themeColor.text}`} />
                )}
              </button>

              <button
                onClick={() => setPaymentMethod('upi')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'upi'
                    ? `${themeColor.border} bg-white dark:bg-slate-800 shadow-sm ring-2 ring-offset-1 ${themeColor.ring}`
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${paymentMethod === 'upi' ? themeColor.bg + ' text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className={`font-bold text-xs block ${textPrimaryClass}`}>UPI QR Transfer</span>
                  </div>
                </div>
                {paymentMethod === 'upi' && (
                  <CheckCircle className={`w-3.5 h-3.5 ${themeColor.text}`} />
                )}
              </button>

              <button
                onClick={() => setPaymentMethod('unpaid')}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'unpaid'
                    ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 shadow-sm ring-2 ring-offset-1 ring-rose-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${paymentMethod === 'unpaid' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className={`font-bold text-xs block ${textPrimaryClass}`}>Mark Unpaid Tab</span>
                  </div>
                </div>
                {paymentMethod === 'unpaid' && (
                  <CheckCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
              </button>
            </div>
          </div>

          {/* UPI Scan QR panel inside the single column */}
          {paymentMethod === 'upi' && (
            <div className={`p-3.5 border rounded-2xl flex flex-col items-center justify-center gap-2 text-center animate-in fade-in slide-in-from-top-1.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'}`}>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">UPI PAYMENT TERMINOR QR</span>
              <div 
                className="relative group cursor-pointer"
                onClick={() => setShowQrFullscreen(true)}
                title="Click to enlarge QR Code"
              >
                <img
                  src={getUpiQrCodeUrl()}
                  alt="UPI Payment QR Code"
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 object-contain border rounded-lg p-1 hover:brightness-95 transition-all bg-white"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-lg">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-medium">Click to scan/view fullscreen QR code</p>
            </div>
          )}

          {/* Unpaid Warning Notice */}
          {paymentMethod === 'unpaid' && (
            <div className={`p-3 border rounded-xl text-[10px] font-medium leading-relaxed ${isDark ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              🚨 Free table now. Dues of ₹{totalAmount.toLocaleString('en-IN')} will lock to customer "{session.player_name}" profile automatically. No receipt report is generated.
            </div>
          )}

          {/* Settle Action Button */}
          <div className="space-y-2 pt-2 border-t border-slate-100/30">
            <button
              onClick={handleCompleteBilling}
              disabled={isProcessing}
              className={`w-full py-3 text-sm font-bold text-white rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                paymentMethod === 'unpaid'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/10'
                  : themeColor.bg + ' ' + themeColor.hover
              } disabled:bg-slate-300`}
            >
              <span>{isProcessing ? 'Saving Transaction...' : paymentMethod === 'unpaid' ? 'Mark as Unpaid Tab' : 'Settle & Mark as Paid'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className={`w-full py-2.5 font-semibold rounded-xl text-xs flex items-center justify-center cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-250 text-slate-700'
              }`}
            >
              Cancel Checkout
            </button>
          </div>
        </div>
      ) : (
        /* STAGE 2: AFTER SETTLEMENT (Expanded Multi-column split-view - printable receipt & print bill action visible!) */
        <div className={`rounded-3xl w-full max-w-4xl shadow-2xl border flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] md:max-h-[85vh] ${modalBgClass}`}>
          
          {/* Detailed Invoice Receipt Left Panel */}
          <div className={`flex-1 p-6 overflow-y-auto border-b md:border-b-0 md:border-r print:p-0 relative ${leftPanelBgClass}`} id="printable-receipt">
            {/* Print only Header */}
            <div className="hidden print-only text-center border-b pb-4 mb-4">
              <h1 className="text-xl font-bold">BILLIARD CAFÉ RECEIPT</h1>
              <p className="text-xs text-gray-500">Live POS Terminal Receipt</p>
            </div>

            {/* PAID Stamp */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-emerald-500/80 text-emerald-600 dark:text-emerald-400 font-black tracking-widest text-2xl uppercase px-5 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 shadow-xl pointer-events-none z-10 flex flex-col items-center gap-1 animate-in zoom-in-75 duration-200">
              <span>★ PAID ★</span>
              <span className="text-[10px] tracking-wider font-bold">VIA {paymentMethod.toUpperCase()}</span>
            </div>

            <div className="flex justify-between items-start pb-4 border-b border-slate-100/30">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">POS INVOICE REPORT</span>
                <h3 className={`text-xl font-extrabold font-display mt-0.5 ${textPrimaryClass}`}>
                  Table #{session.table_number}
                </h3>
                <p className={`text-xs font-medium ${textSecondaryClass}`}>Player: <span className={`${textPrimaryClass} font-bold`}>{session.player_name}</span></p>
              </div>
              
              <div className="text-right">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-800'}`}>
                  {game?.name || 'Billiards'}
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-2">
                  Date: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Time logs */}
            <div className={`my-4 py-3 px-4 rounded-2xl border grid grid-cols-2 gap-4 text-xs font-medium ${isDark ? 'bg-slate-800/40 border-slate-700/50 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Game Details</span>
                <p className={`font-bold ${textPrimaryClass}`}>{game?.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">Rate: ₹{game?.price_per_hour}/hr</p>
              </div>
              <div className="space-y-1 border-l border-slate-200 dark:border-slate-700 pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration Played</span>
                <p className={`font-bold flex items-center gap-1 ${textPrimaryClass}`}>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {session.duration} minutes
                </p>
                <p className="text-[10px] text-slate-400">
                  {new Date(session.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                  {' → '} 
                  {session.end_time ? new Date(session.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
                </p>
              </div>
            </div>

            {/* Bill Breakdowns (Time + Snacks) */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Itemized Billings</h4>
              
              <div className="space-y-2">
                {/* 1. Time charge */}
                <div className={`flex justify-between items-center text-xs p-3 rounded-xl border ${itemBgClass}`}>
                  <div>
                    <span className={`font-bold block ${textPrimaryClass}`}>Table Usage Time</span>
                    <span className="text-[10px] text-slate-400">{session.duration} minutes at ₹{game?.price_per_hour}/hr</span>
                  </div>
                  <span className={`font-bold font-mono ${textPrimaryClass}`}>₹{session.time_amount.toFixed(2)}</span>
                </div>

                {/* 2. Food items */}
                {items.map((item) => (
                  <div key={item.id} className={`flex justify-between items-center text-xs p-3 rounded-xl border ${itemBgClass}`}>
                    <div>
                      <span className={`font-bold block ${textPrimaryClass}`}>{item.item_name}</span>
                      <span className="text-[10px] text-slate-400">₹{item.price} × {item.quantity}</span>
                    </div>
                    <span className={`font-bold font-mono ${textPrimaryClass}`}>₹{item.total.toFixed(2)}</span>
                  </div>
                ))}

                {/* 3. Previous carry-over dues */}
                {session.previous_due > 0 && (
                  <div className={`flex justify-between items-center text-xs p-3 rounded-xl border ${isDark ? 'bg-rose-950/20 border-rose-900/30' : 'bg-rose-50/40 border-rose-100'}`}>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      <div>
                        <span className={`font-bold block ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>Previous Unpaid Tab Balance</span>
                        <span className="text-[10px] text-rose-400 font-medium">Unpaid dues carry forward</span>
                      </div>
                    </div>
                    <span className={`font-bold font-mono ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>₹{session.previous_due.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Totals panel */}
            <div className="mt-6 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className={`flex justify-between ${textSecondaryClass}`}>
                <span>Time Charges Total</span>
                <span className="font-mono">₹{session.time_amount.toFixed(2)}</span>
              </div>
              {foodTotal > 0 && (
                <div className={`flex justify-between ${textSecondaryClass}`}>
                  <span>Snacks & Beverages Total</span>
                  <span className="font-mono">₹{foodTotal.toFixed(2)}</span>
                </div>
              )}
              {session.previous_due > 0 && (
                <div className={`flex justify-between ${textSecondaryClass}`}>
                  <span>Carry-forward Dues</span>
                  <span className="font-mono">₹{session.previous_due.toFixed(2)}</span>
                </div>
              )}

              <div className={`flex justify-between items-center font-bold text-sm pt-3 border-t border-slate-150 dark:border-slate-800 ${textPrimaryClass}`}>
                <span className="font-display font-extrabold text-base">GRAND BILL AMOUNT</span>
                <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Right Settle Status & Printing Controls Panel */}
          <div className={`w-full md:w-80 p-6 flex flex-col justify-between shrink-0 no-print ${rightPanelBgClass}`}>
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-8">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-500 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className={`font-extrabold text-base ${textPrimaryClass}`}>Transaction Settled!</h3>
                <p className={`text-xs ${textSecondaryClass}`}>The session has been completed and marked as paid.</p>
              </div>
              <div className={`p-4 rounded-2xl border w-full space-y-2 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-150'}`}>
                <div className="flex justify-between text-xs">
                  <span className={textSecondaryClass}>Amount Paid:</span>
                  <span className={`font-bold font-mono ${textPrimaryClass}`}>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={textSecondaryClass}>Payment Method:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">{paymentMethod}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-6 border-t border-slate-200/30 dark:border-slate-800">
              <button
                onClick={handlePrint}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
              >
                <Printer className="w-4 h-4" />
                Print Bill Receipt
              </button>
              <button
                onClick={onClose}
                className={`w-full py-3 font-bold rounded-2xl text-sm transition-all cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-250 hover:bg-slate-300 text-slate-700'
                }`}
              >
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen QR Code Overlay Dialog */}
      {showQrFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 relative">
            <button 
              onClick={() => setShowQrFullscreen(false)}
              className="absolute top-4 right-4 bg-slate-100 text-slate-700 font-bold hover:bg-slate-250 h-8 w-8 rounded-full flex items-center justify-center text-xs"
            >
              ✕
            </button>
            <div>
              <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase block mb-1">UPI scan & pay terminal</span>
              <h3 className="text-base font-extrabold font-display text-slate-950">Table #{session.table_number} Settle</h3>
              <p className="text-xs text-slate-400 mt-0.5">Scan with any BHIM, UPI, GPay, Paytm, or PhonePe App</p>
            </div>

            <div className="flex justify-center p-3 border border-slate-100 bg-slate-50 rounded-2xl">
              <img
                src={getUpiQrCodeUrl()}
                alt="UPI QR Code Fullscreen"
                referrerPolicy="no-referrer"
                className="w-64 h-64 object-contain"
              />
            </div>

            <div className="space-y-1 bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider block">Transfer Amount</span>
              <span className="text-2xl font-black font-mono text-emerald-950">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[10px] text-emerald-600 font-medium">Verify transaction status on your device after transfer</p>
            </div>

            <button
              onClick={() => setShowQrFullscreen(false)}
              className={`w-full py-2.5 text-xs font-bold text-white ${themeColor.bg} ${themeColor.hover} rounded-xl transition-colors`}
            >
              Confirm & Return to Settle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
