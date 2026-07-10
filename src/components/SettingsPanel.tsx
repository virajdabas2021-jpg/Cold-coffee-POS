import React, { useState } from 'react';
import { Settings, FontSize } from '../types';
import { Type, Save, Link, Database, Copy, Check, Upload, ShieldAlert, Smartphone } from 'lucide-react';

interface SettingsPanelProps {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => Promise<void>;
  themeColor: { text: string; bg: string; border: string; hover: string; ring: string; gradient: string };
  isDark: boolean;
}

export default function SettingsPanel({
  settings,
  onUpdateSettings,
  themeColor,
  isDark,
}: SettingsPanelProps) {
  // Copy Schema helper
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Handle Font change
  const handleFontChange = async (size: FontSize) => {
    const updated = { ...settings, font_size: size };
    await onUpdateSettings(updated);
  };

  // Handle QR Upload (converts to Base64 to bypass server storage buckets)
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const updated = { ...settings, qr_code_url: base64String };
      await onUpdateSettings(updated);
    };
    reader.readAsDataURL(file);
  };

  // Clear QR code settings
  const handleClearQr = async () => {
    const updated = { ...settings, qr_code_url: '' };
    await onUpdateSettings(updated);
  };

  const copySchemaSQL = () => {
    const sqlCode = `
-- COPY & EXECUTE THIS SCHEMA IN SUPABASE SQL EDITOR

-- 1. Game Rates Catalog
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_per_hour NUMERIC NOT NULL,
  table_count INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Staff Cashier list
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Play Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL DEFAULT 'Guest Player',
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  table_number INTEGER NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER NOT NULL DEFAULT 0,
  time_amount NUMERIC NOT NULL DEFAULT 0,
  food_amount NUMERIC NOT NULL DEFAULT 0,
  previous_due NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Session Items (Food Menu Tracker)
CREATE TABLE IF NOT EXISTS session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Payments History Tracker
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Global Metadata POS settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  qr_code_url TEXT DEFAULT '',
  theme TEXT DEFAULT 'emerald',
  font_size TEXT DEFAULT 'medium'
);

-- Insert Default L2 Admin Credentials (PIN: 1234)
INSERT INTO users (name, pin, role) 
VALUES ('Kartavya Choudhary', '1234', 'admin') 
ON CONFLICT (pin) DO NOTHING;

-- Insert Default L1 Cashier Credentials (PIN: 0000)
INSERT INTO users (name, pin, role) 
VALUES ('Cashier Staff', '0000', 'staff') 
ON CONFLICT (pin) DO NOTHING;

-- Insert Default configuration
INSERT INTO settings (id, theme, font_size) 
VALUES ('default', 'emerald', 'medium') 
ON CONFLICT (id) DO NOTHING;
    `;

    navigator.clipboard.writeText(sqlCode.trim());
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 3000);
  };

  const cardBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/60';
  const textPrimaryClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBgClass = isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-200';

  return (
    <div id="settings-tab" className="space-y-6 animate-in fade-in-50">
      {/* Settings Grid Header */}
      <div className={`p-6 rounded-3xl border shadow-xs ${cardBgClass}`}>
        <h2 className={`text-xl font-extrabold font-display flex items-center gap-2 ${textPrimaryClass}`}>
          <Database className="text-emerald-500 w-5 h-5" />
          POS Settings & Configurations
        </h2>
        <p className={`${textSecondaryClass} text-xs mt-0.5`}>Configure active visual elements, UPI QR pay links, scaling preferences, and backend database sync options.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Font size adjustments */}
        <div className={`rounded-3xl border p-6 space-y-4 ${cardBgClass}`}>
          <h3 className={`font-bold font-display text-sm flex items-center gap-2 border-b border-slate-100/30 pb-3 ${textPrimaryClass}`}>
            <Type className="w-5 h-5 text-rose-500" />
            App Interface Font Scaling
          </h3>
          <p className={`${textSecondaryClass} text-xs leading-relaxed`}>Adjust the responsive font size across the entire billiard cafe POS. Useful for small cashier tablet screens or large terminal monitors.</p>
          
          <div className="flex gap-2.5 pt-4">
            {(['small', 'medium', 'large'] as FontSize[]).map((sz) => {
              const isSelected = settings.font_size === sz;
              return (
                <button
                  key={sz}
                  onClick={() => handleFontChange(sz)}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-transparent shadow-md'
                      : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {sz === 'small' ? 'Compact' : sz === 'medium' ? 'Standard' : 'Magnified'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment UPI QR Code Setup */}
        <div className={`rounded-3xl border p-6 space-y-4 ${cardBgClass}`}>
          <h3 className={`font-bold font-display text-sm flex items-center gap-2 border-b border-slate-100/30 pb-3 ${textPrimaryClass}`}>
            <Smartphone className="w-5 h-5 text-emerald-500" />
            UPI QR Payment QR Code
          </h3>
          <p className={`${textSecondaryClass} text-xs leading-relaxed`}>Upload your branch GPay / PhonePe UPI static QR code image or paste a manual link. This allows cashiers to display QR codes directly on billing checkout modals!</p>
          
          <div className="space-y-4 pt-2">
            {settings.qr_code_url ? (
              <div className="flex items-center gap-4 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                <img src={settings.qr_code_url} alt="POS QR Preview" className="w-16 h-16 object-contain rounded-lg bg-white border p-1" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">Static QR Active</span>
                  <button onClick={handleClearQr} className="py-1 px-3 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded-lg cursor-pointer uppercase tracking-wider">
                    Delete QR Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-3">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <span className={`text-xs font-bold ${textPrimaryClass}`}>Upload GPay / UPI QR Image</span>
                  <p className="text-slate-400 text-[10px]">JPG, PNG supported. Stored locally on this terminal.</p>
                </div>
                <label className={`inline-block py-1.5 px-4 rounded-xl text-white ${themeColor.bg} ${themeColor.hover} text-xs font-bold cursor-pointer transition-colors`}>
                  Browse File
                  <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Database Schema reference copy block */}
      <div className={`p-6 rounded-3xl border space-y-4 ${cardBgClass}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100/30 pb-3">
          <div>
            <h3 className={`font-bold font-display text-sm ${textPrimaryClass}`}>Supabase SQL Schema Blueprint</h3>
            <p className={`${textSecondaryClass} text-xs mt-0.5`}>Run this SQL in your Supabase SQL editor to bootstrap all central data tables.</p>
          </div>
          <button
            onClick={copySchemaSQL}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {copiedSchema ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copiedSchema ? 'SQL Copied!' : 'Copy SQL Schema'}
          </button>
        </div>
      </div>

    </div>
  );
}
