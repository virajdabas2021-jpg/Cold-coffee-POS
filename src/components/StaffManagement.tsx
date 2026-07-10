import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Plus, Edit, Trash2, Users, Shield, Eye, EyeOff, Save, Check, ShieldAlert } from 'lucide-react';

interface StaffManagementProps {
  users: User[];
  currentUser: User | null;
  onAddUser: (user: Omit<User, 'id'>) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  themeColor: { text: string; bg: string; border: string; hover: string; ring: string; gradient: string };
  isDark: boolean;
}

export default function StaffManagement({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  themeColor,
  isDark,
}: StaffManagementProps) {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userPin, setUserPin] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('staff');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showUserPins, setShowUserPins] = useState<{ [userId: string]: boolean }>({});
  const [userError, setUserError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    if (!userName.trim() || !userPin.trim()) return;

    if (userPin.length < 4) {
      setUserError('PIN code must be at least 4 digits.');
      return;
    }

    try {
      if (editingUser) {
        await onUpdateUser({
          ...editingUser,
          name: userName.trim(),
          pin: userPin.trim(),
          role: userRole,
        });
        setEditingUser(null);
        showToast('Staff credentials updated.');
      } else {
        await onAddUser({
          name: userName.trim(),
          pin: userPin.trim(),
          role: userRole,
        });
        showToast('Staff cashier registered successfully.');
      }

      // Reset
      setUserName('');
      setUserPin('');
      setUserRole('staff');
      setIsAddingUser(false);
    } catch (err: any) {
      setUserError(err.message || 'Failed to save staff member.');
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserPin(user.pin);
    setUserRole(user.role);
    setIsAddingUser(true);
  };

  const handleDeleteClick = async (user: User) => {
    if (currentUser?.id === user.id) {
      alert('You cannot delete your own logged-in terminal account.');
      return;
    }
    if (confirm(`Are you sure you want to revoke access PIN and delete staff member: ${user.name}?`)) {
      await onDeleteUser(user.id);
      showToast('Staff member deleted.');
    }
  };

  const togglePinVisibility = (userId: string) => {
    setShowUserPins(prev => ({ ...prev, [userId]: !prev[userId] }));
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
          Staff Cashier registrations and role assignments are restricted to Administrators only. Please log in as an administrator to manage terminals.
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
            <Users className="text-emerald-500 w-5 h-5" />
            Terminal Staff Credentials
          </h2>
          <p className={`${textSecondaryClass} text-xs mt-0.5`}>Manage active cashiers and managers, assign access roles and numeric security PINs.</p>
        </div>
        {!isAddingUser && (
          <button
            onClick={() => {
              setEditingUser(null);
              setUserName('');
              setUserPin('');
              setUserRole('staff');
              setUserError('');
              setIsAddingUser(true);
            }}
            className={`flex items-center gap-1.5 text-white ${themeColor.bg} ${themeColor.hover} py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors`}
          >
            <Plus className="w-4 h-4" /> Add Staff Member
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in-50">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Add / Edit Form Box */}
      {isAddingUser && (
        <form onSubmit={handleUserSubmit} className={`rounded-2xl p-5 border space-y-4 max-w-3xl animate-in slide-in-from-top-2 ${cardBgClass}`}>
          <h4 className={`font-bold text-xs uppercase tracking-wider ${textPrimaryClass}`}>
            {editingUser ? `Edit Staff Member: ${editingUser.name}` : 'Register New Staff Member'}
          </h4>
          
          {userError && (
            <p className="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
              ⚠️ {userError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondaryClass}`}>Employee Name</label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="E.g. John Doe"
                className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondaryClass}`}>Security PIN (4-8 Digits)</label>
              <input
                type="password"
                required
                pattern="[0-9]*"
                inputMode="numeric"
                value={userPin}
                onChange={(e) => setUserPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Numeric PIN Only"
                className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${textSecondaryClass}`}>System Access Role</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputBgClass}`}
              >
                <option value="staff">Staff Cashier (L1 Restricted)</option>
                <option value="admin">Admin Manager (L2 Full Access)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsAddingUser(false);
                setEditingUser(null);
                setUserError('');
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
              {editingUser ? 'Save Cashier' : 'Register Employee'}
            </button>
          </div>
        </form>
      )}

      {/* Staff table list */}
      <div className={`rounded-3xl border overflow-hidden shadow-xs ${cardBgClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${tableHeaderBg} font-bold`}>
                <th className="p-4">Employee Name</th>
                <th className="p-4">Access Level</th>
                <th className="p-4">Numeric PIN Code</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {users.map((u) => {
                const isPinVisible = showUserPins[u.id];
                const isMe = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}>
                    <td className={`p-4 font-bold text-sm ${textPrimaryClass}`}>
                      {u.name} {isMe && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-normal px-1.5 py-0.5 rounded-md ml-1.5">(YOU)</span>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 font-bold uppercase text-[9px] px-2.5 py-1 rounded-full ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400' 
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        <Shield className="w-3 h-3" />
                        {u.role === 'admin' ? 'L2 Admin' : 'L1 Cashier'}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <span>{isPinVisible ? u.pin : '••••'}</span>
                        <button 
                          onClick={() => togglePinVisibility(u.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {isPinVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleEditClick(u)}
                        className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors`}
                        title="Edit credentials"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(u)}
                        disabled={isMe}
                        className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                          isMe 
                            ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' 
                            : 'text-slate-500 hover:text-rose-600 cursor-pointer'
                        }`}
                        title={isMe ? 'Cannot delete logged employee' : 'Delete cashier profile'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
