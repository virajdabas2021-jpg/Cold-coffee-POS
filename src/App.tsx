import React, { useState, useEffect } from 'react';
import { api } from './lib/supabase';
import { Game, User, Session, SessionItem, Settings, PaymentMethod, FontSize } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SessionManager from './components/SessionManager';
import BillingModal from './components/BillingModal';
import UnpaidBills from './components/UnpaidBills';
import SettingsPanel from './components/SettingsPanel';
import RatesPricing from './components/RatesPricing';
import StaffManagement from './components/StaffManagement';
import TransactionsPage from './components/TransactionsPage';
import SalesRecord from './components/SalesRecord';
import { Coffee, Shield, LogOut, LayoutDashboard, Clock, AlertCircle, Settings as SettingsIcon, Database, Check, TrendingUp, Users, Tag, Receipt, Sun, Moon } from 'lucide-react';

// Visual themes corresponding to billiard felt colors
export const THEMES = [
  { id: 'emerald', name: 'Emerald Green (Standard)', felt: '#059669', bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', border: 'border-emerald-600', ring: 'focus:ring-emerald-500', gradient: 'from-emerald-600 to-teal-500' }
];

export default function App() {
  // Current user / Login state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('billiard_pos_logged_user');
    return cached ? JSON.parse(cached) : null;
  });

  // Client-side Dark Theme toggle state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('billiard_pos_is_dark') === 'true';
  });

  // Toggle utility
  const toggleDarkMode = () => {
    const updated = !isDark;
    setIsDark(updated);
    localStorage.setItem('billiard_pos_is_dark', String(updated));
  };

  // Master Settings Configuration state
  const [settings, setSettings] = useState<Settings>({
    id: 'default',
    qr_code_url: '',
    theme: 'emerald',
    font_size: 'medium'
  });

  // HTML root-level scaling effect to perfectly resize all elements
  useEffect(() => {
    const root = document.documentElement;
    if (settings.font_size === 'small') {
      root.style.fontSize = '13px';
    } else if (settings.font_size === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '15px'; // default
    }
  }, [settings.font_size]);

  // Toggle dark mode class on HTML document root
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // DB Sync state
  const [dbConfig, setDbConfig] = useState(api.getDbConfig());
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // Master Data collections
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionItems, setSessionItems] = useState<{ [sessionId: string]: SessionItem[] }>({});

  // UI Active Navigation state
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Live real-time clock state for the Technical theme
  const [currentTime, setCurrentTime] = useState(new Date());

  // Checkout modal trigger state
  const [checkoutSession, setCheckoutSession] = useState<Session | null>(null);

  // Load master data from API (Supabase or Local sandbox fallback)
  const loadData = async () => {
    try {
      const fetchedGames = await api.getGames();
      setGames(fetchedGames);

      const fetchedUsers = await api.getUsers();
      setUsers(fetchedUsers);

      const fetchedSessions = await api.getSessions();
      setSessions(fetchedSessions);

      const fetchedSettings = await api.getSettings();
      setSettings(fetchedSettings);

      // Fetch items for each active or unpaid session to keep totals accurate
      const itemsMap: { [sessionId: string]: SessionItem[] } = {};
      await Promise.all(
        fetchedSessions.map(async (session) => {
          if (session.status === 'active' || session.status === 'unpaid') {
            const items = await api.getSessionItems(session.id);
            itemsMap[session.id] = items;
          }
        })
      );
      setSessionItems(itemsMap);
    } catch (e) {
      console.error('Error fetching terminal data:', e);
    }
  };

  // Initial fetch and Realtime sync setup
  useEffect(() => {
    let active = true;
    let unsubs: Array<() => void> = [];

    // Clock timer interval
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const init = async () => {
      await api.loadGlobalConfig();
      if (!active) return;

      setDbConfig(api.getDbConfig());
      await loadData();
      setIsConfigLoaded(true);

      // Subscribe to real-time changes ONLY after global config has loaded
      unsubs.push(api.subscribeToChanges('sessions', loadData));
      unsubs.push(api.subscribeToChanges('session_items', loadData));
      unsubs.push(api.subscribeToChanges('games', loadData));
      unsubs.push(api.subscribeToChanges('users', loadData));
      unsubs.push(api.subscribeToChanges('settings', loadData));
    };

    init();

    // Config change listener
    const unsubConfig = api.subscribeToChanges('db_config_changed', () => {
      setDbConfig(api.getDbConfig());
      loadData();
    });

    return () => {
      active = false;
      clearInterval(clockInterval);
      unsubs.forEach(unsub => unsub());
      unsubConfig();
    };
  }, []);

  // Handle successful login
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('billiard_pos_logged_user', JSON.stringify(user));
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('billiard_pos_logged_user');
    setActiveTab('dashboard');
  };

  // Create new session
  const handleStartSession = async (sessionData: Omit<Session, 'id'>) => {
    // If previous dues were carried forward, mark older unpaid sessions for this player as paid!
    if (sessionData.previous_due > 0) {
      const playerUnpaid = sessions.filter(
        s => s.player_name.toLowerCase().trim() === sessionData.player_name.toLowerCase().trim() && s.status === 'unpaid'
      );
      for (const oldSession of playerUnpaid) {
        await api.updateSession({
          ...oldSession,
          status: 'paid'
        });
      }
    }
    await api.addSession(sessionData);
    await loadData();
  };

  // Trigger billing preview modal from running table cards
  const handleEndSessionClick = (session: Session, elapsedMinutes: number, timeAmount: number) => {
    // Generate updated checkout temporary instance
    const endSessionTemp: Session = {
      ...session,
      end_time: new Date().toISOString(),
      duration: Math.max(1, elapsedMinutes), // Min 1 minute played
      time_amount: timeAmount,
    };
    setCheckoutSession(endSessionTemp);
  };

  // Settle bill via modal
  const handleConfirmPayment = async (sessionId: string, method: PaymentMethod | 'unpaid') => {
    if (!checkoutSession) return;

    // Get current items in checkout to save amounts
    const items = sessionItems[sessionId] || [];
    const foodTotal = items.reduce((sum, item) => sum + item.total, 0);

    const updatedSession: Session = {
      ...checkoutSession,
      food_amount: foodTotal,
      total_amount: checkoutSession.time_amount + foodTotal + checkoutSession.previous_due,
      status: method === 'unpaid' ? 'unpaid' : 'paid',
    };

    // 1. Update session details in db
    await api.updateSession(updatedSession);

    // 2. If paid fully (Cash or UPI), register receipt transaction record in Payments table
    if (method !== 'unpaid') {
      await api.addPayment({
        session_id: sessionId,
        amount: updatedSession.total_amount,
        method: method,
        paid_at: new Date().toISOString(),
      });
    }

    if (method === 'unpaid') {
      setCheckoutSession(null);
    }
    await loadData();
  };

  // Directly settle outstanding unpaid dues from historical logs screen
  const handleSettleUnpaidDues = async (sessionId: string, method: PaymentMethod) => {
    const sessionToSettle = sessions.find(s => s.id === sessionId);
    if (!sessionToSettle) return;

    const updatedSession: Session = {
      ...sessionToSettle,
      status: 'paid',
    };

    // Update state
    await api.updateSession(updatedSession);

    // Register transaction record
    await api.addPayment({
      session_id: sessionId,
      amount: sessionToSettle.total_amount,
      method: method,
      paid_at: new Date().toISOString(),
    });

    await loadData();
  };

  // Food items transactions
  const handleAddItem = async (item: Omit<SessionItem, 'id'>) => {
    await api.addSessionItem(item);
    await loadData();
  };

  const handleDeleteItem = async (itemId: string) => {
    await api.deleteSessionItem(itemId);
    await loadData();
  };

  // Settings updates
  const handleUpdateSettings = async (updatedSettings: Settings) => {
    await api.updateSettings(updatedSettings);
    await loadData();
  };

  // Games and Users CRUD
  const handleAddGame = async (game: Omit<Game, 'id'>) => {
    await api.addGame(game);
    await loadData();
  };

  const handleUpdateGame = async (game: Game) => {
    await api.updateGame(game);
    await loadData();
  };

  const handleDeleteGame = async (id: string) => {
    await api.deleteGame(id);
    await loadData();
  };

  const handleAddUser = async (user: Omit<User, 'id'>) => {
    await api.addUser(user);
    await loadData();
  };

  const handleUpdateUser = async (user: User) => {
    await api.updateUser(user);
    await loadData();
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    await loadData();
  };

  // Selected Theme class mappings
  const themeColor = THEMES.find(t => t.id === settings.theme) || THEMES[0];

  // Font size multiplier mapping
  const fontSizeClass = 
    settings.font_size === 'small' ? 'text-xs md:text-sm' : 
    settings.font_size === 'large' ? 'text-sm md:text-lg' : 
    'text-xs md:text-base';

  if (!isConfigLoaded) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-emerald-500 rounded-2xl animate-pulse text-white shadow-lg">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-bold font-display tracking-tight text-white">BILLIARD CAFE POS</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  // Render Login overlay if there's no active staff member logged in
  if (!currentUser) {
    return <Login users={users} onLoginSuccess={handleLoginSuccess} />;
  }

  const getNavButtonClass = (tabId: string) => {
    const isActive = activeTab === tabId;
    if (isActive) {
      if (isDark) {
        return 'bg-slate-800 text-white border border-slate-700 font-bold shadow-md';
      }
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold shadow-xs';
    }
    return isDark 
      ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent';
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0f172a] text-slate-100' : 'bg-[#f8fafc] text-slate-900'} flex flex-col ${fontSizeClass}`} style={{ '--felt-color': themeColor.felt } as React.CSSProperties}>
      
      {/* 1. Technical Header Terminal Banner */}
      <header className="bg-[#0f172a] text-white px-6 py-3 shrink-0 flex justify-between items-center z-10 shadow-lg border-b border-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-emerald-500 rounded-lg shrink-0 text-white shadow-inner">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight font-display text-white">BILLIARD CAFE POS</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-medium">Sector 15 • Terminal 01</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700/40 text-slate-300 transition-all cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline text-[10px] font-bold font-mono tracking-wider">
              {isDark ? 'LIGHT MODE' : 'DARK MODE'}
            </span>
          </button>

          {/* Database Status indicator (Technical) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/40">
            <span className={`h-1.5 w-1.5 rounded-full ${dbConfig.isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wider">
              {dbConfig.isConfigured ? 'SUPABASE ACTIVE' : 'SANDBOX MODE'}
            </span>
          </div>
        </div>

        {/* Live Clock & Logged Cashier Profile */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Logged in as</p>
            <p className="text-sm font-semibold tracking-wide text-white">{currentUser.name.toUpperCase()} ({currentUser.role.toUpperCase()})</p>
          </div>

          <div className="hidden sm:block h-8 w-[1px] bg-slate-700" />

          {/* Live Monospace Clock */}
          <div className="hidden sm:block text-right">
            <p className="text-[11px] text-slate-400 font-mono tracking-wider">
              {currentTime.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </p>
            <p className="text-base font-mono leading-none mt-0.5 font-bold tracking-tight text-white">
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Log out of Terminal"
            className="p-2 bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-400 active:scale-95 text-slate-300 rounded-lg transition-all border border-slate-700/50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Navigation Rail (Sleek Sidebar in white/slate style) */}
        <nav className={`${isDark ? 'bg-[#121b2e] border-slate-800' : 'bg-white border-slate-200/80'} border-b md:border-b-0 md:border-r p-3 flex md:flex-col gap-1.5 justify-around md:justify-start shrink-0 z-10 md:w-52 overflow-y-auto max-h-screen`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-3 rounded-xl w-full text-center md:text-left transition-all cursor-pointer ${getNavButtonClass('dashboard')}`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 text-blue-500" />
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-3 rounded-xl w-full text-center md:text-left transition-all cursor-pointer ${getNavButtonClass('sessions')}`}
          >
            <Clock className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Active Play</span>
          </button>

          <button
            onClick={() => setActiveTab('unpaid')}
            className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-3 rounded-xl w-full text-center md:text-left transition-all cursor-pointer ${getNavButtonClass('unpaid')}`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Unpaid Tabs</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-3 rounded-xl w-full text-center md:text-left transition-all cursor-pointer ${getNavButtonClass('transactions')}`}
          >
            <Receipt className="w-4 h-4 shrink-0 text-sky-500" />
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Transactions</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-3 rounded-xl w-full text-center md:text-left transition-all cursor-pointer ${getNavButtonClass('sales')}`}
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Sales Record</span>
          </button>

          {/* Admin Restricted Option */}
          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('rates')}
                className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-3 rounded-xl w-full text-center md:text-left transition-all cursor-pointer ${getNavButtonClass('rates')}`}
              >
                <Tag className="w-4 h-4 shrink-0 text-indigo-500" />
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Rates & Pricing</span>
              </button>

              <button
                onClick={() => setActiveTab('staff')}
                className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-3 rounded-xl w-full text-center md:text-left transition-all cursor-pointer ${getNavButtonClass('staff')}`}
              >
                <Users className="w-4 h-4 shrink-0 text-purple-500" />
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">Staff Access</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-3 rounded-xl w-full text-center md:text-left transition-all cursor-pointer ${getNavButtonClass('settings')}`}
              >
                <SettingsIcon className="w-4 h-4 shrink-0 text-slate-500" />
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider">POS Settings</span>
              </button>
            </>
          )}
        </nav>

        {/* 3. Terminal Content View */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isDark ? 'bg-[#090d16]' : 'bg-slate-50'}`}>
          {activeTab === 'dashboard' && (
            <Dashboard
              sessions={sessions}
              games={games}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              themeColor={themeColor}
              isDark={isDark}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionManager
              sessions={sessions}
              games={games}
              currentUser={currentUser}
              onStartSession={handleStartSession}
              onEndSessionClick={handleEndSessionClick}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              sessionItems={sessionItems}
              themeColor={themeColor}
              isDark={isDark}
            />
          )}

          {activeTab === 'unpaid' && (
            <UnpaidBills
              sessions={sessions}
              games={games}
              sessionItems={sessionItems}
              qrCodeUrl={settings.qr_code_url}
              onSettleDues={handleSettleUnpaidDues}
              themeColor={themeColor}
              isDark={isDark}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsPage
              sessions={sessions}
              games={games}
              sessionItems={sessionItems}
              themeColor={themeColor}
              isDark={isDark}
            />
          )}

          {activeTab === 'sales' && (
            <SalesRecord
              sessions={sessions}
              games={games}
              themeColor={themeColor}
              isDark={isDark}
            />
          )}

          {activeTab === 'rates' && (
            <RatesPricing
              games={games}
              currentUser={currentUser}
              onAddGame={handleAddGame}
              onUpdateGame={handleUpdateGame}
              onDeleteGame={handleDeleteGame}
              themeColor={themeColor}
              isDark={isDark}
            />
          )}

          {activeTab === 'staff' && (
            <StaffManagement
              users={users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              themeColor={themeColor}
              isDark={isDark}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              themeColor={themeColor}
              isDark={isDark}
            />
          )}
        </main>
      </div>

      {/* 4. Billing Receipt Modal Checkout Overlay */}
      {checkoutSession && (
        <BillingModal
          session={checkoutSession}
          games={games}
          items={sessionItems[checkoutSession.id] || []}
          qrCodeUrl={settings.qr_code_url}
          onConfirmPayment={handleConfirmPayment}
          onClose={() => setCheckoutSession(null)}
          themeColor={themeColor}
          isDark={isDark}
        />
      )}
    </div>
  );
}
