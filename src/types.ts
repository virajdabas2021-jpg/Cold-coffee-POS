export type UserRole = 'admin' | 'staff';
export type SessionStatus = 'active' | 'completed' | 'unpaid' | 'paid';
export type PaymentMethod = 'cash' | 'upi';
export type FontSize = 'small' | 'medium' | 'large';

export interface User {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
  created_at?: string;
}

export interface Game {
  id: string;
  name: string;
  price_per_hour: number;
  table_count: number;
  created_at?: string;
}

export interface Session {
  id: string;
  player_name: string;
  game_id: string;
  table_number: number;
  start_time: string; // ISO string
  end_time: string | null; // ISO string
  duration: number; // in minutes
  time_amount: number;
  food_amount: number;
  previous_due: number;
  total_amount: number;
  status: SessionStatus;
  created_at?: string;
}

export interface SessionItem {
  id: string;
  session_id: string;
  item_name: string;
  price: number;
  quantity: number;
  total: number;
  created_at?: string;
}

export interface Payment {
  id: string;
  session_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string; // ISO string
}

export interface Settings {
  id: string;
  qr_code_url: string; // Base64 or uploaded URL
  theme: string; // e.g. 'emerald', 'amber', 'slate', 'indigo', 'rose', 'nord'
  font_size: FontSize;
}
