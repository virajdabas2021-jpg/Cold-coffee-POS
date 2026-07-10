-- SQL Schema for Billiard Cafe POS
-- Paste this into your Supabase SQL Editor to set up the database tables and Enable Realtime.

-- 1. Create Tables

-- Games Table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  table_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users / Staff Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  pin VARCHAR(10) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name VARCHAR(255) NOT NULL DEFAULT 'Guest',
  game_id UUID REFERENCES games(id) ON DELETE RESTRICT,
  table_number INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER NOT NULL DEFAULT 0, -- in minutes
  time_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  food_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  previous_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'completed', 'unpaid', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Items (Food & Beverages added during session)
CREATE TABLE IF NOT EXISTS session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  method VARCHAR(50) NOT NULL CHECK (method IN ('cash', 'upi')),
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table (Single Row)
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  qr_code_url TEXT NOT NULL DEFAULT '',
  theme VARCHAR(50) NOT NULL DEFAULT 'emerald',
  font_size VARCHAR(50) NOT NULL DEFAULT 'medium'
);

-- 2. Seed Default Data

-- Seed default settings if empty
INSERT INTO settings (id, qr_code_url, theme, font_size)
VALUES ('default', '', 'emerald', 'medium')
ON CONFLICT (id) DO NOTHING;

-- Seed default admin user (PIN: 1234) and default staff user (PIN: 5555)
INSERT INTO users (name, pin, role)
VALUES 
  ('Cafe Admin', '1234', 'admin'),
  ('Floor Staff', '5555', 'staff')
ON CONFLICT (pin) DO NOTHING;

-- Seed some default games
INSERT INTO games (name, price_per_hour, table_count)
VALUES 
  ('Standard Pool', 120.00, 4),
  ('VIP Snooker', 200.00, 2),
  ('English Billiards', 150.00, 2)
ON CONFLICT DO NOTHING;

-- 3. Enable Realtime Publications
-- Run this to allow the client to listen to changes on sessions, items, etc.
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table session_items;
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table settings;
