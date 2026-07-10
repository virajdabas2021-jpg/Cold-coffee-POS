import React, { useState } from 'react';
import { Game, User } from '../types';
import { Plus, Edit, Trash2, Tag, Layers, IndianRupee, Save, ShieldAlert, Check } from 'lucide-react';

interface RatesPricingProps {
  games: Game[];
  currentUser: User | null;
  onAddGame: (game: Omit<Game, 'id'>) => Promise<void>;
  onUpdateGame: (game: Game) => Promise<void>;
  onDeleteGame: (id: string) => Promise<void>;
  themeColor: { text: string; bg: string; border: string; hover: string; ring: string; gradient: string };
  isDark: boolean;
}

export default function RatesPricing({
  games,
  currentUser,
  onAddGame,
  onUpdateGame,
  onDeleteGame,
  themeColor,
  isDark,
}: RatesPricingProps) {
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameName, setGameName] = useState('');
  const [gameRate, setGameRate] = useState<number>(100);
  const [gameTables, setGameTables] = useState<number>(4);
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || gameRate <= 0 || gameTables <= 0) return;

    if (editingGame) {
      await onUpdateGame({
        ...editingGame,
        name: gameName.trim(),
        price_per_hour: gameRate,
        table_count: gameTables,
      });
      setEditingGame(null);
      showToast('Game style updated successfully!');
    } else {
      await onAddGame({
        name: gameName.trim(),
        price_per_hour: gameRate,
        table_count: gameTables,
      });
      showToast('New game style added successfully!');
    }

    // Reset Form
    setGameName('');
    setGameRate(100);
    setGameTables(4);
    setIsAddingGame(false);
  };

  const handleEditClick = (game: Game) => {
    setEditingGame(game);
    setGameName(game.name);
    setGameRate(game.price_per_hour);
    setGameTables(game.table_count);
    setIsAddingGame(true);
  };

  const handleDeleteClick = async (gameId: string) => {
    if (confirm('Are you sure you want to delete this game type? All existing tables under this type will be removed from POS.')) {
      await onDeleteGame(gameId);
      showToast('Game style deleted.');
    }
  };

  const cardBgClass = isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/60';
  const textPrimaryClass = isDark ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const tableHeaderBg = isDark ? 'bg-slate-850/50 text-slate-400' : 'bg-slate-50/75 text-slate-500';
  const inputBgClass = isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-200';

  if (currentUser?.role !== 'admin') {
    return (
      <div className={`rounded-3xl p-16 text-center max-w-xl mx-auto space-y-4 border ${cardBgClass}`}>
        <div className="inline-flex p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-full dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400">
          <ShieldAlert className="w-10 h-10 animate-bounce" />
        </div>
        <h3 className={`text-lg font-bold font-display ${textPrimaryClass}`}>Access Restricted</h3>
        <p className={`${textSecondaryClass} text-sm leading-relaxed`}>
          Game pricing and hourly table rate configurations are restricted to Administrators only. Please log in as an administrator to access these settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-3xl p-6 border shadow-xs ${cardBgClass}`}>
        <div>
          <h2 className={`text-xl font-extrabold font-display flex items-center gap-2 ${textPrimaryClass}`}>
            <Tag className="text-emerald-500 w-5 h-5" />
            Game Rates & Pricing Models
          </h2>
          <p className={`${textSecondaryClass} text-xs mt-0.5`}>Configure game styles, hourly felt rates, and specific table counts for inventory tracking.</p>
        </div>
        {!isAddingGame && (
          <button
            onClick={() => {
              setEditingGame(null);
              setGameName('');
              setGameRate(120);
              setGameTables(4);
              setIsAddingGame(true);
            }}
            className={`flex items-center gap-1.5 text-white ${themeColor.bg} ${themeColor.hover} py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors`}
          >
            <Plus className="w-4 h-4" /> Add Game Style
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in-50">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Add / Edit Form Box */}
      {isAddingGame && (
        <form onSubmit={handleGameSubmit} className={`rounded-2xl p-5 border space-y-4 max-w-3xl animate-in slide-in-from-top-2 ${cardBgClass}`}>
          <h4 className={`font-bold text-xs uppercase tracking-wider ${textPrimaryClass}`}>
            {editingGame ? `Edit Pricing Style: ${editingGame.name}` : 'Create New Game Pricing Style'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondaryClass}`}>Game Style Name</label>
              <input
                type="text"
                required
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="E.g. Snooker Pro"
                className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondaryClass}`}>Price Per Hour (₹)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  value={gameRate || ''}
                  onChange={(e) => setGameRate(parseFloat(e.target.value) || 0)}
                  placeholder="Hourly Rate"
                  className={`w-full border rounded-xl p-2.5 text-xs pl-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
                />
                <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondaryClass}`}>Total Tables Available</label>
              <input
                type="number"
                required
                min="1"
                max="50"
                value={gameTables || ''}
                onChange={(e) => setGameTables(parseInt(e.target.value) || 0)}
                placeholder="Table count"
                className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsAddingGame(false);
                setEditingGame(null);
              }}
              className="py-1.5 px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`py-1.5 px-4 text-white ${themeColor.bg} ${themeColor.hover} text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1`}
            >
              <Save className="w-3.5 h-3.5" />
              {editingGame ? 'Save Rate' : 'Publish Rate'}
            </button>
          </div>
        </form>
      )}

      {/* Pricing table list */}
      <div className={`rounded-3xl border overflow-hidden shadow-xs ${cardBgClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${tableHeaderBg} font-bold`}>
                <th className="p-4">Game Style Name</th>
                <th className="p-4">Hourly Play Rate</th>
                <th className="p-4">Table Inventory Capacity</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {games.map((g) => (
                <tr key={g.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}>
                  <td className={`p-4 font-bold text-sm ${textPrimaryClass}`}>{g.name}</td>
                  <td className="p-4 font-mono font-bold text-emerald-500 text-sm">₹{g.price_per_hour.toFixed(2)} / hour</td>
                  <td className="p-4 font-medium flex items-center gap-1.5 mt-1 text-sm">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>{g.table_count} Tables</span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleEditClick(g)}
                      className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors`}
                      title="Edit hourly rate"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(g.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 cursor-pointer transition-colors"
                      title="Delete game type"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {games.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No game rates registered yet. Click the "Add Game Style" button to setup tables and hourly bills!
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
