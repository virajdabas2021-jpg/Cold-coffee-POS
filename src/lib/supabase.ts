import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Game, User, Session, SessionItem, Payment, Settings } from '../types';

// Storage keys for local sandbox
const LOCAL_STORAGE_PREFIX = 'billiard_pos_';
const KEYS = {
  GAMES: `${LOCAL_STORAGE_PREFIX}games`,
  USERS: `${LOCAL_STORAGE_PREFIX}users`,
  SESSIONS: `${LOCAL_STORAGE_PREFIX}sessions`,
  ITEMS: `${LOCAL_STORAGE_PREFIX}items`,
  PAYMENTS: `${LOCAL_STORAGE_PREFIX}payments`,
  SETTINGS: `${LOCAL_STORAGE_PREFIX}settings`,
  ENV_URL: `${LOCAL_STORAGE_PREFIX}env_url`,
  ENV_KEY: `${LOCAL_STORAGE_PREFIX}env_key`,
};

// Seed defaults
const DEFAULT_GAMES: Game[] = [
  { id: 'g1', name: 'Standard Pool', price_per_hour: 120.00, table_count: 6 },
  { id: 'g2', name: 'VIP Snooker', price_per_hour: 200.00, table_count: 2 },
  { id: 'g3', name: 'Russian Pyramid', price_per_hour: 180.00, table_count: 2 },
  { id: 'g4', name: 'French Carom', price_per_hour: 150.00, table_count: 2 },
];

const DEFAULT_USERS: User[] = [
  { id: 'u1', name: 'Kartavya Choudhary', pin: '1234', role: 'admin' },
  { id: 'u2', name: 'Floor Staff', pin: '5555', role: 'staff' },
  { id: 'u3', name: 'Billiard Pro Staff', pin: '1111', role: 'staff' },
];

const DEFAULT_SETTINGS: Settings = {
  id: 'default',
  qr_code_url: '', // Empty initially
  theme: 'emerald',
  font_size: 'medium',
};

// Simple event-emitter for real-time emulations in Sandbox mode
class SandboxEventEmitter {
  private listeners: { [key: string]: Array<() => void> } = {};

  subscribe(event: string, callback: () => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb();
        } catch (err) {
          console.error('Error in sandbox listener:', err);
        }
      });
    }
  }
}

export const sandboxEvents = new SandboxEventEmitter();

// Helper to get/set localStorage safely
const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const val = localStorage.getItem(key);
      if (!val) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      }
      return JSON.parse(val) as T;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to set localStorage', e);
    }
  }
};

// Initialize Sandbox lists if they don't exist
const initializeSandboxData = () => {
  storage.get<Game[]>(KEYS.GAMES, DEFAULT_GAMES);
  storage.get<User[]>(KEYS.USERS, DEFAULT_USERS);
  storage.get<Settings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  storage.get<Session[]>(KEYS.SESSIONS, [
    {
      id: 's-sample-active',
      player_name: 'John Doe',
      game_id: 'g1',
      table_number: 3,
      start_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
      end_time: null,
      duration: 0,
      time_amount: 0,
      food_amount: 30,
      previous_due: 0,
      total_amount: 0,
      status: 'active'
    },
    {
      id: 's-sample-completed',
      player_name: 'Jane Smith',
      game_id: 'g2',
      table_number: 1,
      start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      end_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      duration: 60,
      time_amount: 200,
      food_amount: 50,
      previous_due: 0,
      total_amount: 250,
      status: 'paid'
    }
  ]);
  storage.get<SessionItem[]>(KEYS.ITEMS, [
    {
      id: 'si-1',
      session_id: 's-sample-active',
      item_name: 'Cold Coffee',
      price: 15,
      quantity: 2,
      total: 30
    },
    {
      id: 'si-2',
      session_id: 's-sample-completed',
      item_name: 'French Fries',
      price: 25,
      quantity: 2,
      total: 50
    }
  ]);
  storage.get<Payment[]>(KEYS.PAYMENTS, [
    {
      id: 'p-1',
      session_id: 's-sample-completed',
      amount: 250,
      method: 'cash',
      paid_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    }
  ]);
};

// Run initialization
initializeSandboxData();

// Detect credentials
let cachedGlobalUrl: string | null = null;
let cachedGlobalKey: string | null = null;
let isLoadedGlobal = false;

export async function loadGlobalConfig(): Promise<void> {
  try {
    const res = await fetch('/api/db-config');
    if (res.ok) {
      const data = await res.json();
      if (data.url && data.key) {
        cachedGlobalUrl = data.url;
        cachedGlobalKey = data.key;
      }
    }
  } catch (e) {
    console.warn('Failed to load global db config from server', e);
  } finally {
    isLoadedGlobal = true;
  }
}

export function getSupabaseCredentials() {
  const url = 'https://nrxcaimqmuqtlsepmrhh.supabase.co';
  const key = 'sb_publishable_PckCD6vpwFsR2ESWG1T3KA_J-_uQTpJ';

  return { url, key, isConfigured: true };
}

// Global Supabase client reference
let realSupabaseClient: SupabaseClient | null = null;

export function getRealSupabaseClient(): SupabaseClient | null {
  if (realSupabaseClient) return realSupabaseClient;

  const { url, key, isConfigured } = getSupabaseCredentials();
  if (isConfigured) {
    try {
      realSupabaseClient = createClient(url, key);
      return realSupabaseClient;
    } catch (e) {
      console.error('Failed to initialize real Supabase client', e);
      return null;
    }
  }
  return null;
}

// Reset client when settings are updated
export function resetRealSupabaseClient() {
  realSupabaseClient = null;
}

// Check configuration status
export function isUsingRealSupabase(): boolean {
  return getRealSupabaseClient() !== null;
}

// Unified API Service
export const api = {
  // CONFIGURATION UTILS
  async loadGlobalConfig() {
    await loadGlobalConfig();
  },

  getDbConfig() {
    return getSupabaseCredentials();
  },

  async setDbConfig(url: string, key: string) {
    // Save to local device fallback
    if (url) localStorage.setItem(KEYS.ENV_URL, url);
    else localStorage.removeItem(KEYS.ENV_URL);

    if (key) localStorage.setItem(KEYS.ENV_KEY, key);
    else localStorage.removeItem(KEYS.ENV_KEY);

    // Save globally to server config
    try {
      await fetch('/api/db-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, key })
      });
      cachedGlobalUrl = url;
      cachedGlobalKey = key;
    } catch (e) {
      console.error('Failed to save global db config to server', e);
    }

    resetRealSupabaseClient();
    sandboxEvents.emit('db_config_changed');
  },

  // GAMES CRUD
  async getGames(): Promise<Game[]> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('games')
        .select('*')
        .order('name');
      if (!error && data) return data as Game[];
      console.warn('Supabase fetch games error, falling back to sandbox', error);
    }
    return storage.get<Game[]>(KEYS.GAMES, DEFAULT_GAMES);
  },

  async addGame(game: Omit<Game, 'id'>): Promise<Game> {
    const client = getRealSupabaseClient();
    const newGame = { ...game, id: crypto.randomUUID() };

    if (client) {
      const { data, error } = await client
        .from('games')
        .insert([{ name: game.name, price_per_hour: game.price_per_hour, table_count: game.table_count }])
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('games');
        return data as Game;
      }
      console.error('Supabase addGame error:', error);
    }

    // Fallback to local
    const games = storage.get<Game[]>(KEYS.GAMES, DEFAULT_GAMES);
    games.push(newGame);
    storage.set(KEYS.GAMES, games);
    sandboxEvents.emit('games');
    return newGame;
  },

  async updateGame(game: Game): Promise<Game> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('games')
        .update({ name: game.name, price_per_hour: game.price_per_hour, table_count: game.table_count })
        .eq('id', game.id)
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('games');
        return data as Game;
      }
      console.error('Supabase updateGame error:', error);
    }

    const games = storage.get<Game[]>(KEYS.GAMES, DEFAULT_GAMES);
    const index = games.findIndex(g => g.id === game.id);
    if (index !== -1) {
      games[index] = game;
      storage.set(KEYS.GAMES, games);
    }
    sandboxEvents.emit('games');
    return game;
  },

  async deleteGame(id: string): Promise<boolean> {
    const client = getRealSupabaseClient();
    if (client) {
      const { error } = await client
        .from('games')
        .delete()
        .eq('id', id);
      if (!error) {
        sandboxEvents.emit('games');
        return true;
      }
      console.error('Supabase deleteGame error:', error);
    }

    const games = storage.get<Game[]>(KEYS.GAMES, DEFAULT_GAMES);
    const filtered = games.filter(g => g.id !== id);
    storage.set(KEYS.GAMES, filtered);
    sandboxEvents.emit('games');
    return true;
  },

  // USERS CRUD
  async getUsers(): Promise<User[]> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('users')
        .select('*')
        .order('name');
      if (!error && data) return data as User[];
      console.warn('Supabase fetch users error, falling back to sandbox', error);
    }
    return storage.get<User[]>(KEYS.USERS, DEFAULT_USERS);
  },

  async addUser(user: Omit<User, 'id'>): Promise<User> {
    const client = getRealSupabaseClient();
    const newUser = { ...user, id: crypto.randomUUID() };

    if (client) {
      const { data, error } = await client
        .from('users')
        .insert([{ name: user.name, pin: user.pin, role: user.role }])
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('users');
        return data as User;
      }
      console.error('Supabase addUser error:', error);
    }

    const users = storage.get<User[]>(KEYS.USERS, DEFAULT_USERS);
    // Ensure unique PIN locally
    if (users.some(u => u.pin === user.pin)) {
      throw new Error('A staff member with this PIN already exists.');
    }
    users.push(newUser);
    storage.set(KEYS.USERS, users);
    sandboxEvents.emit('users');
    return newUser;
  },

  async updateUser(user: User): Promise<User> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('users')
        .update({ name: user.name, pin: user.pin, role: user.role })
        .eq('id', user.id)
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('users');
        return data as User;
      }
      console.error('Supabase updateUser error:', error);
    }

    const users = storage.get<User[]>(KEYS.USERS, DEFAULT_USERS);
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      // Ensure PIN is unique (excluding themselves)
      if (users.some(u => u.pin === user.pin && u.id !== user.id)) {
        throw new Error('A staff member with this PIN already exists.');
      }
      users[index] = user;
      storage.set(KEYS.USERS, users);
    }
    sandboxEvents.emit('users');
    return user;
  },

  async deleteUser(id: string): Promise<boolean> {
    const client = getRealSupabaseClient();
    if (client) {
      const { error } = await client
        .from('users')
        .delete()
        .eq('id', id);
      if (!error) {
        sandboxEvents.emit('users');
        return true;
      }
      console.error('Supabase deleteUser error:', error);
    }

    const users = storage.get<User[]>(KEYS.USERS, DEFAULT_USERS);
    const filtered = users.filter(u => u.id !== id);
    storage.set(KEYS.USERS, filtered);
    sandboxEvents.emit('users');
    return true;
  },

  // SESSIONS CRUD
  async getSessions(): Promise<Session[]> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('sessions')
        .select('*')
        .order('start_time', { ascending: false });
      if (!error && data) return data as Session[];
      console.warn('Supabase fetch sessions error, falling back to sandbox', error);
    }
    return storage.get<Session[]>(KEYS.SESSIONS, []);
  },

  async addSession(session: Omit<Session, 'id'>): Promise<Session> {
    const client = getRealSupabaseClient();
    const newSession = { ...session, id: crypto.randomUUID() };

    if (client) {
      const { data, error } = await client
        .from('sessions')
        .insert([{
          player_name: session.player_name,
          game_id: session.game_id,
          table_number: session.table_number,
          start_time: session.start_time,
          end_time: session.end_time,
          duration: session.duration,
          time_amount: session.time_amount,
          food_amount: session.food_amount,
          previous_due: session.previous_due,
          total_amount: session.total_amount,
          status: session.status
        }])
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('sessions');
        return data as Session;
      }
      console.error('Supabase addSession error:', error);
    }

    const sessions = storage.get<Session[]>(KEYS.SESSIONS, []);
    sessions.unshift(newSession);
    storage.set(KEYS.SESSIONS, sessions);
    sandboxEvents.emit('sessions');
    return newSession;
  },

  async updateSession(session: Session): Promise<Session> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('sessions')
        .update({
          player_name: session.player_name,
          game_id: session.game_id,
          table_number: session.table_number,
          start_time: session.start_time,
          end_time: session.end_time,
          duration: session.duration,
          time_amount: session.time_amount,
          food_amount: session.food_amount,
          previous_due: session.previous_due,
          total_amount: session.total_amount,
          status: session.status
        })
        .eq('id', session.id)
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('sessions');
        return data as Session;
      }
      console.error('Supabase updateSession error:', error);
    }

    const sessions = storage.get<Session[]>(KEYS.SESSIONS, []);
    const index = sessions.findIndex(s => s.id === session.id);
    if (index !== -1) {
      sessions[index] = session;
      storage.set(KEYS.SESSIONS, sessions);
    }
    sandboxEvents.emit('sessions');
    return session;
  },

  // SESSION ITEMS
  async getSessionItems(sessionId: string): Promise<SessionItem[]> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('session_items')
        .select('*')
        .eq('session_id', sessionId);
      if (!error && data) {
        return (data as any[]).map(item => ({
          ...item,
          total: item.total !== undefined && item.total !== null 
            ? Number(item.total) 
            : Number(item.price) * Number(item.quantity)
        })) as SessionItem[];
      }
      console.warn('Supabase fetch session items error, falling back to sandbox', error);
    }
    const items = storage.get<SessionItem[]>(KEYS.ITEMS, []);
    return items.filter(item => item.session_id === sessionId);
  },

  async addSessionItem(item: Omit<SessionItem, 'id'>): Promise<SessionItem> {
    const client = getRealSupabaseClient();
    const newItem = { ...item, id: crypto.randomUUID() };

    if (client) {
      const { data, error } = await client
        .from('session_items')
        .insert([{
          session_id: item.session_id,
          item_name: item.item_name,
          price: item.price,
          quantity: item.quantity
        }])
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('session_items');
        return {
          ...data,
          total: data.total !== undefined && data.total !== null 
            ? Number(data.total) 
            : Number(data.price) * Number(data.quantity)
        } as SessionItem;
      }
      console.error('Supabase addSessionItem error:', error);
    }

    const items = storage.get<SessionItem[]>(KEYS.ITEMS, []);
    items.push(newItem);
    storage.set(KEYS.ITEMS, items);

    // Automatically recalculate food_amount and total_amount for the session
    const sessions = storage.get<Session[]>(KEYS.SESSIONS, []);
    const session = sessions.find(s => s.id === item.session_id);
    if (session) {
      const sessionItems = items.filter(i => i.session_id === item.session_id);
      const foodTotal = sessionItems.reduce((acc, curr) => acc + curr.total, 0);
      session.food_amount = foodTotal;
      session.total_amount = session.time_amount + session.food_amount + session.previous_due;
      storage.set(KEYS.SESSIONS, sessions);
      sandboxEvents.emit('sessions');
    }

    sandboxEvents.emit('session_items');
    return newItem;
  },

  async deleteSessionItem(id: string): Promise<boolean> {
    const client = getRealSupabaseClient();
    
    // Find the session_id before deleting so we can update session amounts
    const items = storage.get<SessionItem[]>(KEYS.ITEMS, []);
    const itemToDelete = items.find(i => i.id === id);
    const sessionId = itemToDelete?.session_id;

    if (client) {
      const { error } = await client
        .from('session_items')
        .delete()
        .eq('id', id);
      if (!error) {
        sandboxEvents.emit('session_items');
        sandboxEvents.emit('sessions');
        return true;
      }
      console.error('Supabase deleteSessionItem error:', error);
    }

    const filtered = items.filter(i => i.id !== id);
    storage.set(KEYS.ITEMS, filtered);

    if (sessionId) {
      const sessions = storage.get<Session[]>(KEYS.SESSIONS, []);
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        const sessionItems = filtered.filter(i => i.session_id === sessionId);
        const foodTotal = sessionItems.reduce((acc, curr) => acc + curr.total, 0);
        session.food_amount = foodTotal;
        session.total_amount = session.time_amount + session.food_amount + session.previous_due;
        storage.set(KEYS.SESSIONS, sessions);
        sandboxEvents.emit('sessions');
      }
    }

    sandboxEvents.emit('session_items');
    return true;
  },

  // PAYMENTS CRUD
  async getPayments(): Promise<Payment[]> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('payments')
        .select('*')
        .order('paid_at', { ascending: false });
      if (!error && data) return data as Payment[];
      console.warn('Supabase fetch payments error, falling back to sandbox', error);
    }
    return storage.get<Payment[]>(KEYS.PAYMENTS, []);
  },

  async addPayment(payment: Omit<Payment, 'id'>): Promise<Payment> {
    const client = getRealSupabaseClient();
    const newPayment = { ...payment, id: crypto.randomUUID() };

    if (client) {
      const { data, error } = await client
        .from('payments')
        .insert([{
          session_id: payment.session_id,
          amount: payment.amount,
          method: payment.method,
          paid_at: payment.paid_at
        }])
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('payments');
        return data as Payment;
      }
      console.error('Supabase addPayment error:', error);
    }

    const payments = storage.get<Payment[]>(KEYS.PAYMENTS, []);
    payments.unshift(newPayment);
    storage.set(KEYS.PAYMENTS, payments);
    sandboxEvents.emit('payments');
    return newPayment;
  },

  // SETTINGS
  async getSettings(): Promise<Settings> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('settings')
        .select('*')
        .eq('id', 'default')
        .single();
      if (!error && data) return data as Settings;
      console.warn('Supabase fetch settings error, falling back to sandbox', error);
    }
    return storage.get<Settings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  async updateSettings(settings: Settings): Promise<Settings> {
    const client = getRealSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('settings')
        .update({
          qr_code_url: settings.qr_code_url,
          theme: settings.theme,
          font_size: settings.font_size
        })
        .eq('id', 'default')
        .select()
        .single();
      if (!error && data) {
        sandboxEvents.emit('settings');
        return data as Settings;
      }
      console.error('Supabase updateSettings error:', error);
    }

    storage.set(KEYS.SETTINGS, settings);
    sandboxEvents.emit('settings');
    return settings;
  },

  // REALTIME REAL TIME LISTENERS
  subscribeToChanges(table: string, callback: () => void) {
    const client = getRealSupabaseClient();
    if (client) {
      // Connect to actual Supabase Realtime channel
      const channel = client
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, () => {
          callback();
        })
        .subscribe();
      
      return () => {
        client.removeChannel(channel);
      };
    } else {
      // Sandbox Mode: Use our local event emitter
      return sandboxEvents.subscribe(table, callback);
    }
  }
};
