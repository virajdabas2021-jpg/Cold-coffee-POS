import React, { useState, useEffect } from 'react';
import { Shield, Key, Eye, EyeOff, Coffee } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function Login({ users, onLoginSuccess }: LoginProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPins, setShowPins] = useState<boolean>(false);

  // Support physical keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  const handleDigit = (digit: string) => {
    setError('');
    if (pin.length < 8) {
      const newPin = pin + digit;
      setPin(newPin);
      // Auto-submit on 4 digits (standard PIN length)
      if (newPin.length === 4) {
        // Trigger auto submit shortly
        setTimeout(() => checkPin(newPin), 250);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const checkPin = (pinToCheck: string) => {
    const foundUser = users.find(u => u.pin === pinToCheck);
    if (foundUser) {
      onLoginSuccess(foundUser);
    } else {
      setError('Invalid PIN code. Please try again.');
      setPin('');
    }
  };

  const handleSubmit = () => {
    if (!pin) {
      setError('Please enter your staff PIN.');
      return;
    }
    checkPin(pin);
  };

  return (
    <div id="login-container" className="min-h-screen flex flex-col justify-center items-center bg-slate-900 text-white px-4 relative overflow-hidden">
      {/* Abstract Billiard background graphics */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* Brand / Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl shadow-xl shadow-emerald-950/40 mb-3.5 border border-emerald-400/20">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display bg-gradient-to-r from-emerald-400 via-emerald-200 to-white bg-clip-text text-transparent">
            BILLIARD CAFÉ
          </h1>
          <p className="text-sm text-slate-400 font-medium tracking-wide mt-1">
            POINT OF SALE TERMINAL
          </p>
        </div>

        {/* PIN pad Card */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-700/50">
          <div className="text-center mb-6">
            <div className="mb-3">
              <span className="text-sm font-extrabold uppercase tracking-wide text-emerald-400 block">
                Admin - Kartavya Choudhary
              </span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest block mt-0.5">
                Enter PIN to Authorize
              </span>
            </div>
            
            {/* Dots Display */}
            <div className="flex justify-center items-center gap-3 h-12 mb-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                    pin.length > index
                      ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-[0_0_10px_#34d399]'
                      : 'border-slate-600 bg-transparent'
                  }`}
                />
              ))}
              {pin.length > 4 && (
                <span className="text-emerald-400 font-mono text-xl ml-2">+{pin.length - 4}</span>
              )}
            </div>

            {error ? (
              <p className="text-xs font-medium text-rose-400 bg-rose-500/10 py-1.5 px-3 rounded-full inline-block">
                {error}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Use onscreen keypad or keyboard
              </p>
            )}
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleDigit(digit)}
                className="h-14 rounded-2xl bg-slate-700/50 hover:bg-slate-700 active:scale-95 text-xl font-bold font-mono border border-slate-700/30 hover:border-slate-600 transition-all text-slate-200 hover:text-white cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}
            
            {/* Clear Button */}
            <button
              onClick={handleClear}
              className="h-14 rounded-2xl bg-slate-700/20 hover:bg-slate-700/40 text-sm font-semibold tracking-wide text-slate-400 hover:text-slate-200 active:scale-95 transition-all cursor-pointer select-none"
            >
              CLEAR
            </button>

            {/* Zero Button */}
            <button
              onClick={() => handleDigit('0')}
              className="h-14 rounded-2xl bg-slate-700/50 hover:bg-slate-700 active:scale-95 text-xl font-bold font-mono border border-slate-700/30 hover:border-slate-600 transition-all text-slate-200 hover:text-white cursor-pointer select-none"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-slate-700/20 hover:bg-slate-700/40 text-sm font-semibold tracking-wide text-slate-400 hover:text-slate-200 active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
            >
              DEL
            </button>
          </div>

          {/* Manual Enter Submit */}
          {pin.length > 0 && pin.length !== 4 && (
            <button
              onClick={handleSubmit}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wider uppercase rounded-2xl shadow-lg shadow-emerald-950/20 transition-all"
            >
              PROCEED
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
