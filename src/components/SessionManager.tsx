import React, { useState, useEffect } from 'react';
import { Play, Plus, Clock, ShoppingCart, CheckCircle, Trash2, Search, Users, ShieldAlert } from 'lucide-react';
import { Session, Game, SessionItem, User } from '../types';
import { api } from '../lib/supabase';

interface SessionManagerProps {
  sessions: Session[];
  games: Game[];
  currentUser: User | null;
  onStartSession: (sessionData: Omit<Session, 'id'>) => Promise<void>;
  onEndSessionClick: (session: Session, finalDuration: number, finalTimeAmount: number) => void;
  onAddItem: (item: Omit<SessionItem, 'id'>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  sessionItems: { [sessionId: string]: SessionItem[] };
  themeColor: { text: string; bg: string; border: string; hover: string; ring: string; gradient: string };
  isDark?: boolean;
}

// Popular Quick Presets for snacks/beverages to speed up POS operations
const FOOD_PRESETS = [
  { name: 'Mineral Water (1L)', price: 20 },
  { name: 'Cold Soda / Cola', price: 40 },
  { name: 'Espresso Coffee', price: 60 },
  { name: 'Masala Chai', price: 30 },
  { name: 'French Fries', price: 100 },
  { name: 'Club Sandwich', price: 150 },
  { name: 'Chicken Nuggets', price: 180 },
  { name: 'Potato Chips', price: 35 },
];

export default function SessionManager({
  sessions,
  games,
  currentUser,
  onStartSession,
  onEndSessionClick,
  onAddItem,
  onDeleteItem,
  sessionItems,
  themeColor,
  isDark = false,
}: SessionManagerProps) {
  // Local state
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [previousDue, setPreviousDue] = useState<number>(0);
  
  // Food modal
  const [activeFoodSession, setActiveFoodSession] = useState<Session | null>(null);
  const [foodName, setFoodName] = useState('');
  const [foodPrice, setFoodPrice] = useState<number>(0);
  const [foodQty, setFoodQty] = useState<number>(1);

  // Live timer ticks state (seconds elapsed since render, triggers re-render)
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update table count choices when game selection changes
  useEffect(() => {
    if (selectedGameId) {
      const game = games.find(g => g.id === selectedGameId);
      if (game) {
        setTableNumber(1);
      }
    }
  }, [selectedGameId, games]);

  // Autocomplete & Look up Unpaid Dues when player name is entered
  useEffect(() => {
    if (playerName.trim()) {
      // Find all completed sessions with status = 'unpaid' for this player (case insensitive)
      const playerUnpaid = sessions.filter(
        s => s.player_name.toLowerCase().trim() === playerName.toLowerCase().trim() && s.status === 'unpaid'
      );
      const totalDue = playerUnpaid.reduce((sum, s) => sum + s.total_amount, 0);
      setPreviousDue(totalDue);
    } else {
      setPreviousDue(0);
    }
  }, [playerName, sessions]);

  // Handle start session form submission
  const handleSubmitStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGameId) return;

    const sessionData: Omit<Session, 'id'> = {
      player_name: playerName.trim() || 'Guest Player',
      game_id: selectedGameId,
      table_number: tableNumber,
      start_time: new Date().toISOString(),
      end_time: null,
      duration: 0,
      time_amount: 0,
      food_amount: 0,
      previous_due: previousDue,
      total_amount: previousDue, // Initial is just previous due
      status: 'active'
    };

    await onStartSession(sessionData);
    
    // Reset form
    setPlayerName('');
    setSelectedGameId('');
    setTableNumber(1);
    setPreviousDue(0);
    setIsStartingSession(false);
  };

  // Handle Food presets
  const handleApplyPreset = (preset: { name: string; price: number }) => {
    setFoodName(preset.name);
    setFoodPrice(preset.price);
  };

  // Add Item Submit
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFoodSession || !foodName.trim() || foodPrice <= 0 || foodQty <= 0) return;

    const itemData: Omit<SessionItem, 'id'> = {
      session_id: activeFoodSession.id,
      item_name: foodName.trim(),
      price: foodPrice,
      quantity: foodQty,
      total: foodPrice * foodQty
    };

    await onAddItem(itemData);

    // Reset Food Form
    setFoodName('');
    setFoodPrice(0);
    setFoodQty(1);
  };

  // Helpers for timer cards
  const calculateLiveBill = (session: Session) => {
    const game = games.find(g => g.id === session.game_id);
    if (!game) return { elapsedMinutes: 0, timeAmount: 0, total: 0 };

    const startTime = new Date(session.start_time).getTime();
    const now = Date.now();
    const elapsedMs = Math.max(0, now - startTime);
    const elapsedMinutes = Math.floor(elapsedMs / 1000 / 60);

    // Minimum 1-minute billing, rate calculated pro-rata
    const timeAmount = (elapsedMinutes / 60) * game.price_per_hour;
    const roundedTimeAmount = Math.max(1.0, parseFloat(timeAmount.toFixed(2)));

    // Total = game cost + food items + unpaid carry-over
    const items = sessionItems[session.id] || [];
    const foodTotal = items.reduce((sum, item) => sum + item.total, 0);

    return {
      elapsedMinutes,
      timeAmount: roundedTimeAmount,
      total: roundedTimeAmount + foodTotal + session.previous_due,
      foodTotal
    };
  };

  const getTimerString = (startTimeStr: string) => {
    const startTime = new Date(startTimeStr).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - startTime);
    const diffSecs = Math.floor(diffMs / 1000);
    
    const hrs = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Unpaid Customers Quick Match click
  const selectUnpaidCustomer = (customerName: string) => {
    setPlayerName(customerName);
  };

  // Active Sessions
  const activeSessions = sessions.filter(s => s.status === 'active');

  // List of distinct customers who currently have outstanding unpaid dues
  const unpaidCustomers = Array.from(
    new Set(
      sessions
        .filter(s => s.status === 'unpaid')
        .map(s => s.player_name)
    )
  );

  // Dynamic class styling variables
  const cardBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/50';
  const textPrimaryClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBgClass = isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-slate-50 border-slate-200/80 text-slate-900';
  const modalBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-100';

  return (
    <div className="space-y-6">
      {/* Action Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-xl font-extrabold font-display flex items-center gap-2 ${textPrimaryClass}`}>
            <Clock className="w-5 h-5 text-slate-500" />
            Live Game Timers & Active Tables
          </h2>
          <p className={`${textSecondaryClass} text-xs`}>Manage active billiard sessions, start timers, and bill drinks/snacks.</p>
        </div>

        <button
          onClick={() => setIsStartingSession(true)}
          className={`flex items-center gap-1.5 text-white ${themeColor.bg} ${themeColor.hover} py-2.5 px-4 rounded-2xl shadow-md cursor-pointer font-bold tracking-wide transition-all duration-150 active:scale-95`}
        >
          <Plus className="w-4.5 h-4.5" />
          START NEW SESSION
        </button>
      </div>

      {/* Starting New Session Form Panel Modal */}
      {isStartingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className={`${modalBgClass} rounded-3xl p-6 w-full max-w-lg shadow-2xl border space-y-4 animate-in fade-in zoom-in-95 duration-150`}>
            <div className={`flex justify-between items-center pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className={`text-lg font-bold font-display flex items-center gap-2 ${textPrimaryClass}`}>
                <Play className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                Initialize New Play Session
              </h3>
              <button 
                onClick={() => setIsStartingSession(false)}
                className={`text-slate-400 hover:text-slate-200 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-850' : 'bg-slate-100'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitStart} className="space-y-4">
              {/* Game type selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Game Style
                </label>
                <select
                  required
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className={`w-full rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
                >
                  <option value="">-- Choose Pool, Snooker or Billiard style --</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>
                      {game.name} (₹{game.price_per_hour}/hr)
                    </option>
                  ))}
                </select>
              </div>

              {/* Table selection */}
              {selectedGameId && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assign Table Number
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: games.find(g => g.id === selectedGameId)?.table_count || 1 }).map((_, i) => {
                      const tNo = i + 1;
                      const isOccupied = sessions.some(s => s.game_id === selectedGameId && s.table_number === tNo && s.status === 'active');
                      return (
                        <button
                          key={tNo}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => setTableNumber(tNo)}
                          className={`p-3 rounded-xl font-bold font-mono text-sm border flex flex-col items-center justify-center transition-all ${
                            isOccupied 
                              ? 'bg-rose-50/10 dark:bg-rose-950/10 border-rose-100/30 text-rose-400 cursor-not-allowed opacity-50' 
                              : tableNumber === tNo 
                                ? `${themeColor.bg} text-white border-transparent shadow-sm` 
                                : isDark 
                                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>T-{tNo}</span>
                          <span className="text-[8px] font-sans font-normal mt-0.5">
                            {isOccupied ? 'Occupied' : 'Vacant'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Player Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Player / Customer Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter player name (Optional)"
                    className={`w-full rounded-xl p-3 text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
                  />
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                
                {/* Autocomplete unpaid list warning helper */}
                {unpaidCustomers.length > 0 && !playerName && (
                  <div className={`mt-1.5 p-3.5 border rounded-xl space-y-1 ${isDark ? 'bg-amber-950/10 border-amber-900/40' : 'bg-amber-50/50 border-amber-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                      <ShieldAlert className={`w-3.5 h-3.5 ${isDark ? 'text-amber-500' : 'text-amber-600'}`} />
                      Quick Match Unpaid Customers
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {unpaidCustomers.slice(0, 4).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => selectUnpaidCustomer(name)}
                          className={`border text-[10px] font-medium py-1 px-2.5 rounded-full transition-colors cursor-pointer ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700 hover:border-amber-500/50 hover:bg-amber-950/20 text-slate-300' 
                              : 'bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Automatic Unpaid Dues Notice */}
              {previousDue > 0 && (
                <div className={`p-3.5 border rounded-xl flex items-start gap-2.5 animate-in slide-in-from-top-1 ${isDark ? 'bg-rose-950/10 border-rose-900/40' : 'bg-rose-50 border-rose-100'}`}>
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-rose-400' : 'text-rose-800'}`}>
                      Outstanding Unpaid Dues Found!
                    </h4>
                    <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                      {playerName} has outstanding unpaid tabs totaling <span className="font-bold">₹{previousDue.toLocaleString('en-IN')}</span>. 
                      This balance will automatically consolidate into their final bill.
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStartingSession(false)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedGameId}
                  className={`flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-md cursor-pointer transition-all ${
                    selectedGameId ? themeColor.bg + ' ' + themeColor.hover : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  Start Game Timer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Food Addition Modal */}
      {activeFoodSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className={`${modalBgClass} rounded-3xl p-6 w-full max-w-2xl shadow-2xl border flex flex-col md:flex-row gap-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]`}>
            {/* Form Section */}
            <div className="flex-1 space-y-4">
              <div className={`flex justify-between items-center pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div>
                  <h3 className={`text-base font-bold font-display flex items-center gap-1.5 ${textPrimaryClass}`}>
                    <ShoppingCart className="w-5 h-5 text-slate-500" />
                    Bill Drinks & Snacks
                  </h3>
                  <span className={`text-[10px] font-medium block ${textSecondaryClass}`}>
                    Table {activeFoodSession.table_number} • {activeFoodSession.player_name}
                  </span>
                </div>
                <button 
                  onClick={() => setActiveFoodSession(null)}
                  className={`text-slate-400 hover:text-slate-200 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center md:hidden ${isDark ? 'bg-slate-850' : 'bg-slate-100'}`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddItemSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="E.g. Cappuccino, Hot Fries"
                    className={`w-full rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Unit Price (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={foodPrice || ''}
                      onChange={(e) => setFoodPrice(parseFloat(e.target.value) || 0)}
                      placeholder="Price"
                      className={`w-full rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Quantity
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={foodQty}
                      onChange={(e) => setFoodQty(parseInt(e.target.value) || 1)}
                      className={`w-full rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 text-sm font-bold text-white rounded-xl shadow-md cursor-pointer ${themeColor.bg} ${themeColor.hover}`}
                >
                  Add to Bill (₹{foodPrice * foodQty})
                </button>
              </form>

              {/* Quick food presets */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Quick Speed Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FOOD_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2 border rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`font-semibold block truncate ${textPrimaryClass}`}>{preset.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">₹{preset.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Added items review list */}
            <div className={`flex-1 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-5 flex flex-col justify-between max-h-[60vh] md:max-h-full ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="space-y-3 flex-1 overflow-y-auto">
                <div className={`flex justify-between items-center pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <h4 className={`font-bold text-sm ${textPrimaryClass}`}>Cart items</h4>
                  <button 
                    onClick={() => setActiveFoodSession(null)}
                    className={`text-slate-400 hover:text-slate-200 text-sm font-bold w-8 h-8 rounded-full hidden md:flex items-center justify-center ${isDark ? 'bg-slate-850' : 'bg-slate-100'}`}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(sessionItems[activeFoodSession.id] || []).map((item) => (
                    <div key={item.id} className={`flex justify-between items-center p-2.5 rounded-xl border ${
                      isDark ? 'bg-slate-800/50 border-slate-750' : 'bg-slate-50 rounded-xl border border-slate-100'
                    }`}>
                      <div>
                        <h5 className={`font-semibold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.item_name}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">₹{item.price} × {item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono text-xs ${textPrimaryClass}`}>₹{item.total}</span>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(sessionItems[activeFoodSession.id] || []).length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <ShoppingCart className="w-10 h-10 mx-auto opacity-20 mb-2" />
                      <p className="text-xs">No food items added yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-xs text-slate-500">Drinks / Snacks Total</span>
                  <span className={`font-mono ${textPrimaryClass}`}>
                    ₹{((sessionItems[activeFoodSession.id] || []).reduce((sum, item) => sum + item.total, 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  onClick={() => setActiveFoodSession(null)}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer text-center block"
                >
                  Close & Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Grid of Active Sessions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSessions.map((session) => {
          const game = games.find(g => g.id === session.game_id);
          const liveBill = calculateLiveBill(session);
          
          return (
            <div
              key={session.id}
              className={`${cardBgClass} rounded-2xl border-2 ${themeColor.border} shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between`}
            >
              {/* Card top banner with Table and Game Name */}
              <div className={`p-5 pb-3.5 border-b ${isDark ? 'border-slate-800 bg-slate-800/20' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                      TABLE {session.table_number.toString().padStart(2, '0')}
                    </span>
                    <h3 className={`text-base font-extrabold tracking-tight mt-0.5 ${textPrimaryClass}`}>
                      {game?.name || 'Billiards'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono tracking-wider">ACTIVE</span>
                  </div>
                </div>

                <div className={`mt-3.5 flex items-center justify-between text-xs pt-2.5 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{session.player_name || 'Anonymous Guest'}</span>
                  </div>
                  <span className="text-slate-400 text-[10px] font-mono">
                    SINCE {new Date(session.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              </div>

              {/* Live metrics counters */}
              <div className={`p-5 py-4 grid grid-cols-2 gap-4 border-b ${isDark ? 'border-slate-800 bg-slate-800/10' : 'border-slate-100 bg-white'}`}>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">DURATION</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className={`text-xl font-bold font-mono tracking-tight ${textPrimaryClass}`}>
                      {getTimerString(session.start_time)}
                    </span>
                  </div>
                  <span className="text-[9px] font-medium text-slate-400 block font-mono">
                    Rate: ₹{game?.price_per_hour}/hr
                  </span>
                </div>

                <div className={`space-y-1 border-l pl-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">RUNNING BILL</span>
                  <span className={`text-xl font-extrabold font-mono ${themeColor.text} block tracking-tight`}>
                    ₹{liveBill.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] font-medium text-slate-400 block">
                    Time: ₹{liveBill.timeAmount.toLocaleString('en-IN')}
                    {liveBill.foodTotal > 0 && ` + Food: ₹${liveBill.foodTotal}`}
                    {session.previous_due > 0 && ` + Due: ₹${session.previous_due}`}
                  </span>
                </div>
              </div>

              {/* Action operations buttons */}
              <div className={`p-4 flex gap-2 ${isDark ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
                <button
                  onClick={() => setActiveFoodSession(session)}
                  className={`flex-1 py-2 px-3 text-[11px] font-bold uppercase tracking-wider border rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 hover:border-slate-600 hover:bg-slate-750 text-slate-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                  Add Food
                </button>
                <button
                  onClick={() => onEndSessionClick(session, liveBill.elapsedMinutes, liveBill.timeAmount)}
                  className={`flex-1 py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-white ${themeColor.bg} ${themeColor.hover} rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  End Play
                </button>
              </div>
            </div>
          );
        })}

        {activeSessions.length === 0 && (
          <div className={`col-span-full rounded-2xl p-16 border text-center space-y-4 shadow-xs ${cardBgClass}`}>
            <div className={`inline-flex p-5 rounded-full text-slate-400 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h3 className={`text-base font-extrabold ${textPrimaryClass}`}>No Active Tables Running</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                All billiard tables are currently vacant. Start a new session below to assign a table and initiate the game timer.
              </p>
            </div>
            <button
              onClick={() => setIsStartingSession(true)}
              className={`inline-flex items-center gap-1.5 text-xs text-white ${themeColor.bg} ${themeColor.hover} py-2 px-4 rounded-lg font-bold uppercase tracking-wider`}
            >
              <Plus className="w-4 h-4" /> Start New Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
