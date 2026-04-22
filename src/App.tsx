/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Lock, 
  Globe, 
  Zap, 
  History, 
  Settings as SettingsIcon, 
  X, 
  Plus, 
  AlertTriangle,
  ChevronRight,
  LogOut,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInHours, addHours, isAfter } from 'date-fns';

// --- Types ---
interface BlockedSite {
  id: string;
  domain: string;
  category: string;
}

interface AppState {
  isAuthenticated: boolean;
  isFocusModeOn: boolean;
  blockedSites: BlockedSite[];
  password: string;
  failedAttempts: number;
  lockoutUntil: string | null;
  focusStreak: number;
  lastFocusDate: string | null;
}

// --- Constants ---
const INITIAL_BLOCKED_SITES: BlockedSite[] = [
  { id: '1', domain: 'facebook.com', category: 'Social Media' },
  { id: '2', domain: 'instagram.com', category: 'Social Media' },
  { id: '3', domain: 'tiktok.com', category: 'Entertainment' },
  { id: '4', domain: 'youtube.com', category: 'Entertainment' },
  { id: '5', domain: 'twitter.com', category: 'Social Media' },
];

const LOCKOUT_HOURS = 8;
const MAX_ATTEMPTS = 5;

export default function FocusShield() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'blocker' | 'history' | 'settings'>('dashboard');
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('focus_shield_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...parsed, isAuthenticated: false }; // Always lock on refresh
    }
    return {
      isAuthenticated: false,
      isFocusModeOn: false,
      blockedSites: INITIAL_BLOCKED_SITES,
      password: '1234', // Default password
      failedAttempts: 0,
      lockoutUntil: null,
      focusStreak: 0,
      lastFocusDate: null,
    };
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [showWarningSim, setShowWarningSim] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('focus_shield_state', JSON.stringify(state));
  }, [state]);

  // --- Lockout Logic ---
  const isLockedOut = useMemo(() => {
    if (!state.lockoutUntil) return false;
    return isAfter(new Date(state.lockoutUntil), new Date());
  }, [state.lockoutUntil]);

  const timeLeft = useMemo(() => {
    if (!state.lockoutUntil) return '';
    const diff = differenceInHours(new Date(state.lockoutUntil), new Date());
    return `${diff + 1} hours remaining`;
  }, [state.lockoutUntil]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (passwordInput === state.password) {
      setState(prev => ({ ...prev, isAuthenticated: true, failedAttempts: 0, lockoutUntil: null }));
      setPasswordInput('');
      setError('');
    } else {
      const newAttempts = state.failedAttempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutTime = addHours(new Date(), LOCKOUT_HOURS).toISOString();
        setState(prev => ({ ...prev, failedAttempts: 0, lockoutUntil: lockoutTime }));
        setError(`Too many attempts. Locked for ${LOCKOUT_HOURS} hours.`);
      } else {
        setState(prev => ({ ...prev, failedAttempts: newAttempts }));
        setError(`Incorrect password. ${MAX_ATTEMPTS - newAttempts} attempts left.`);
      }
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false }));
  };

  // --- Blocker Actions ---
  const toggleFocusMode = () => {
    setState(prev => {
      const currentlyOn = !prev.isFocusModeOn;
      let newStreak = prev.focusStreak;
      const today = format(new Date(), 'yyyy-MM-dd');
      
      if (currentlyOn && prev.lastFocusDate !== today) {
        newStreak += 1;
      }
      
      return { 
        ...prev, 
        isFocusModeOn: currentlyOn,
        focusStreak: newStreak,
        lastFocusDate: today
      };
    });
  };

  const addSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    const site: BlockedSite = {
      id: Date.now().toString(),
      domain: newDomain.toLowerCase().replace('https://', '').replace('http://', '').split('/')[0],
      category: 'Custom'
    };
    setState(prev => ({ ...prev, blockedSites: [...prev.blockedSites, site] }));
    setNewDomain('');
  };

  const removeSite = (id: string) => {
    setState(prev => ({ ...prev, blockedSites: prev.blockedSites.filter(s => s.id !== id) }));
  };

  const updatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setSettingsMsg('Password must be at least 4 digits');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSettingsMsg('Passwords do not match');
      return;
    }
    setState(prev => ({ ...prev, password: newPassword }));
    setNewPassword('');
    setConfirmPassword('');
    setSettingsMsg('Password updated successfully!');
    setTimeout(() => setSettingsMsg(''), 3000);
  };

  // --- UI Components ---
  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card w-full max-w-md text-center border-accent-safe/20"
        >
          <div className="flex justify-center mb-8">
            <div className="shield-icon-shape"></div>
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-tighter">FocusShield</h1>
          <p className="text-text-dim mb-10 text-sm">SECURE ACCESS GATEWAY</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <input 
                type="password"
                placeholder="PIN REQUIRED"
                className="w-full bg-white/5 border border-glass-border rounded-2xl py-5 text-center text-2xl tracking-[1em] focus:border-accent-safe focus:ring-1 focus:ring-accent-safe outline-none transition-all"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                disabled={isLockedOut}
                maxLength={4}
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-4 bg-accent-danger/10 border border-accent-danger/20 rounded-xl text-accent-danger text-xs font-semibold"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error.toUpperCase()} {isLockedOut && `(${timeLeft.toUpperCase()})`}</span>
              </motion.div>
            )}

            <button 
              type="submit"
              className="btn-primary w-full py-5 text-lg uppercase tracking-widest shadow-glow-safe"
              disabled={isLockedOut || passwordInput.length < 4}
            >
              Unlock Protection
            </button>
          </form>

          {isLockedOut && (
            <div className="mt-8 pt-8 border-t border-glass-border">
              <div className="flex items-center justify-center gap-4 text-accent-danger text-[10px] uppercase tracking-widest font-bold">
                <Clock className="w-3 h-3" />
                <span>Deep Freeze Active</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar - Desktop */}
      <nav className="hidden md:flex flex-col w-72 border-r border-glass-border p-8 bg-bg-card/50 backdrop-blur-2xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="shield-icon-shape scale-90"></div>
          <span className="font-bold text-xl tracking-tight">FocusShield</span>
        </div>

        <div className="flex-1 space-y-3">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Zap />} label="OS Dashboard" />
          <NavButton active={activeTab === 'blocker'} onClick={() => setActiveTab('blocker')} icon={<Globe />} label="Restricted Domains" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} label="System Logs" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon />} label="Protocols" />
        </div>

        <button onClick={handleLogout} className="flex items-center gap-3 text-text-dim hover:text-accent-danger transition-all p-4 rounded-2xl hover:bg-accent-danger/10 group">
          <LogOut className="w-5 h-5 group-hover:rotate-180 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-wider">Lock Terminal</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12 space-y-10">
        <header className="flex items-center justify-between border-b border-glass-border pb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">System Integrity</h2>
            <p className="text-text-dim text-sm mt-1">OPERATIONAL STATUS: READY</p>
          </div>
          <div className="px-6 py-3 bg-white/5 border border-glass-border rounded-full flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-widest text-text-dim font-bold">Streak</span>
            <span className="text-sm font-bold text-accent-safe flex items-center gap-2">
              <Zap className="w-4 h-4 fill-accent-safe" />
              {state.focusStreak} DAYS
            </span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dash"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Focus Mode Toggle */}
              <div className="lg:col-span-8 flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-glass-border rounded-[32px] relative overflow-hidden group">
                <motion.div 
                  className={`absolute inset-0 transition-opacity duration-1000 ${state.isFocusModeOn ? 'opacity-20' : 'opacity-0'}`}
                  style={{ background: 'radial-gradient(circle, var(--color-accent-safe) 0%, transparent 70%)' }}
                />
                
                <div className={`focus-circle ${state.isFocusModeOn ? 'active' : ''}`}>
                  <button 
                    onClick={toggleFocusMode}
                    className={`power-btn ${state.isFocusModeOn ? 'bg-accent-safe text-bg-deep shadow-glow-safe' : 'bg-white/10 text-text-dim hover:text-white hover:bg-white/20'}`}
                  >
                    <Zap className={`w-10 h-10 ${state.isFocusModeOn ? 'fill-current' : ''}`} />
                  </button>
                  <div className={`text-xs font-bold uppercase tracking-[0.2em] ${state.isFocusModeOn ? 'text-accent-safe' : 'text-text-dim'}`}>
                    {state.isFocusModeOn ? 'Focus Active' : 'Shield Standby'}
                  </div>
                </div>

                <div className="mt-12 text-center relative z-10">
                  <h3 className="text-xl font-bold mb-2">Maximum Shielding Active</h3>
                  <p className="text-sm text-text-dim max-w-xs">Cloud-based DNS filtering is protecting your current session from distractions.</p>
                </div>
              </div>

              {/* Status Column */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass-card flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-text-dim">Protocol Status</span>
                    <div className="flex items-center gap-2 text-green-400 text-[10px] font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                      ENCRYPTED
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center text-sm p-4 bg-white/5 rounded-2xl border border-glass-border">
                      <span className="text-text-dim">Blocked Entities</span>
                      <span className="font-bold text-accent-safe">{state.blockedSites.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm p-4 bg-white/5 rounded-2xl border border-glass-border">
                      <span className="text-text-dim">Network State</span>
                      <span className="font-bold text-accent-safe">FILTERING</span>
                    </div>
                  </div>

                  {state.isFocusModeOn && (
                    <button 
                      onClick={() => setShowWarningSim(true)}
                      className="text-[10px] uppercase font-bold tracking-widest text-accent-safe/60 hover:text-accent-safe transition-colors"
                    >
                      Verify Shield Warning <span className="ml-1">→</span>
                    </button>
                  )}
                </div>

                <div className="p-6 rounded-[24px] bg-accent-danger/5 border border-accent-danger/20">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-accent-danger mb-2">Security Warning</div>
                  <p className="text-xs text-text-dim leading-relaxed">System is strictly locked. Multiple PIN failures will trigger 8-hour immobilization mode.</p>
                </div>
              </div>

              {/* Quick Sites List */}
              <div className="lg:col-span-12 glass-card">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold">Restricted Perimeter</h3>
                  <button onClick={() => setActiveTab('blocker')} className="text-accent-safe text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-70">
                    Modify <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {state.blockedSites.slice(0, 4).map(site => (
                    <div key={site.id} className="p-5 bg-white/5 border border-glass-border rounded-2xl flex flex-col gap-3 group hover:border-accent-safe/30 transition-all">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-text-dim group-hover:text-accent-safe">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm truncate">{site.domain}</p>
                        <p className="text-[10px] uppercase text-text-dim font-bold tracking-wider">{site.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'blocker' && (
            <motion.div 
              key="block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card max-w-3xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-bold uppercase tracking-widest">Domain Matrix</h3>
                <span className="text-xs text-text-dim font-bold">{state.blockedSites.length} ACTIVE PATHS</span>
              </div>

              <form onSubmit={addSite} className="flex gap-4 mb-10">
                <input 
                  type="text"
                  placeholder="DOMAIN: example.com"
                  className="flex-1 bg-white/5 border border-glass-border rounded-[18px] px-6 py-4 outline-none focus:border-accent-safe transition-all font-mono text-sm"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                />
                <button type="submit" className="px-8 bg-accent-safe/10 border border-accent-safe/30 text-accent-safe font-bold rounded-[18px] hover:bg-accent-safe hover:text-bg-deep transition-all flex items-center gap-2">
                  <Plus className="w-5 h-5" /> ADD
                </button>
              </form>

              <div className="space-y-3">
                {state.blockedSites.map(site => (
                  <div key={site.id} className="flex items-center justify-between p-5 bg-white/5 rounded-[22px] border border-glass-border hover:bg-white/[0.08] transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-text-dim">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold">{site.domain}</p>
                        <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest">{site.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-accent-safe/10 rounded-full border border-accent-safe/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-safe animate-pulse" />
                        <span className="text-[9px] font-bold text-accent-safe uppercase tracking-widest">Shielded</span>
                      </div>
                      <button 
                        onClick={() => removeSite(site.id)}
                        className="p-3 text-text-dim hover:text-accent-danger transition-colors bg-white/5 rounded-xl hover:bg-accent-danger/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="hist"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card text-center py-24 bg-white/[0.02]"
            >
              <div className="max-w-xs mx-auto space-y-8">
                <div className="w-24 h-24 bg-accent-safe/5 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-accent-safe/30 group">
                  <History className="w-10 h-10 text-accent-safe group-hover:rotate-[-45deg] transition-transform duration-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 tracking-tighter">Operational Analytics</h3>
                  <p className="text-text-dim text-sm leading-relaxed">Extended session telemetry is being processed for visual compilation.</p>
                </div>
                <div className="p-6 bg-accent-safe/[0.03] rounded-[24px] border border-accent-safe/10">
                  <p className="text-[10px] uppercase tracking-widest text-text-dim font-black mb-3">Total Efficiency</p>
                  <p className="text-4xl font-black text-accent-safe tracking-tighter">{state.focusStreak} DAYS</p>
                  <p className="text-[9px] text-accent-safe/50 font-bold uppercase mt-2">Continuous Protection Achievement</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-xl"
            >
              <div className="glass-card">
                <div className="flex items-center gap-4 mb-10 pb-6 border-b border-glass-border">
                  <SettingsIcon className="w-6 h-6 text-accent-safe" />
                  <h3 className="text-xl font-bold uppercase tracking-widest">Protocol Override</h3>
                </div>
                
                <form onSubmit={updatePassword} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] text-text-dim uppercase font-black tracking-[0.2em] block mb-3">New System PIN</label>
                      <input 
                        type="password"
                        maxLength={4}
                        className="w-full bg-white/5 border border-glass-border rounded-2xl px-5 py-4 outline-none focus:border-accent-safe transition-all text-center tracking-[1em]"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="****"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-dim uppercase font-black tracking-[0.2em] block mb-3">Confirm Secure PIN</label>
                      <input 
                        type="password"
                        maxLength={4}
                        className="w-full bg-white/5 border border-glass-border rounded-2xl px-5 py-4 outline-none focus:border-accent-safe transition-all text-center tracking-[1em]"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="****"
                      />
                    </div>
                  </div>

                  {settingsMsg && (
                    <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider ${settingsMsg.includes('success') ? 'bg-accent-safe/10 text-accent-safe border border-accent-safe/20' : 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20'}`}>
                      {settingsMsg}
                    </div>
                  )}
                  <button type="submit" className="btn-primary w-full py-5 text-sm uppercase tracking-widest">Update Authorization Code</button>
                </form>

                <div className="mt-12 pt-10 border-t border-glass-border">
                  <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-widest text-text-dim">
                    <Shield className="w-4 h-4" /> Hardened Protocols
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-glass-border">
                      <div>
                        <span className="font-bold text-sm block">Auto-Lockdown Mode</span>
                        <span className="text-[10px] text-text-dim font-bold uppercase tracking-widest">8 Hour Security Freeze</span>
                      </div>
                      <div className="w-12 h-7 bg-accent-safe/20 rounded-full relative border border-accent-safe/10">
                        <div className="absolute right-1 top-1 w-5 h-5 bg-accent-safe rounded-full shadow-[0_0_10px_rgba(0,242,255,0.5)]" />
                      </div>
                    </div>
                    <div className="p-4 bg-accent-danger/5 rounded-2xl">
                      <p className="text-[10px] leading-relaxed text-text-dim font-medium">Critical safety instruction: This app is configured for high-level student protection. Force Lockout is a core security invariant and cannot be bypassed.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warning Simulation Overlay */}
        <AnimatePresence>
          {showWarningSim && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-bg-deep/95 backdrop-blur-3xl flex items-center justify-center p-8 text-center"
              style={{ backgroundImage: 'radial-gradient(circle, #ff3e3e11 0%, #05070a 100%)' }}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-lg"
              >
                <div className="w-28 h-28 bg-accent-danger/20 rounded-[32px] flex items-center justify-center mx-auto mb-10 ring-2 ring-accent-danger/50 shadow-glow-danger animate-pulse">
                  <Shield className="w-14 h-14 text-accent-danger" />
                </div>
                <h2 className="text-5xl font-black mb-6 text-accent-danger tracking-tighter">PERIMETER BREACH</h2>
                
                <div className="p-8 bg-white/5 border border-accent-danger/20 rounded-[32px] mb-10 backdrop-blur-3xl shadow-2xl">
                  <p className="text-2xl font-bold text-white mb-2">ACCESS INTERCEPTED</p>
                  <p className="text-text-dim font-mono text-sm tracking-widest">DESTINATION: YOUTUBE.COM</p>
                  <div className="mt-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase text-accent-danger tracking-widest">
                    <AlertTriangle className="w-4 h-4" /> CLOUD SHIELD ACTIVE
                  </div>
                </div>
                
                <p className="text-text-dim mb-12 text-lg italic leading-relaxed font-serif max-w-md mx-auto">"Discipline is the bridge between goals and accomplishment."</p>
                
                <button 
                  onClick={() => setShowWarningSim(false)}
                  className="w-full bg-white/5 border-2 border-glass-border hover:bg-white/10 text-white font-bold py-6 rounded-[24px] text-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Terminate Breach <X className="w-6 h-6" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <footer className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-bg-card border border-glass-border rounded-[28px] flex items-center justify-around px-8 z-50 backdrop-blur-3xl shadow-2xl">
        <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Zap />} />
        <MobileNavButton active={activeTab === 'blocker'} onClick={() => setActiveTab('blocker')} icon={<Globe />} />
        <MobileNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History />} />
        <MobileNavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon />} />
        <button onClick={handleLogout} className="p-3 text-text-dim hover:text-accent-danger transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </footer>
    </div>
  );
}

// --- Subcomponents ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-5 p-5 rounded-[22px] font-bold text-sm uppercase tracking-wider transition-all duration-300 border-2 border-transparent ${
        active 
        ? 'bg-accent-safe/10 text-accent-safe border-accent-safe/20 shadow-glow-safe/10' 
        : 'text-text-dim hover:text-text-main hover:bg-white/5'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: `w-5 h-5 ${active ? 'fill-current' : ''}` })}
      <span>{label}</span>
      {active && <motion.div layoutId="activeDot" className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-safe shadow-[0_0_8px_rgba(0,242,255,1)]" />}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl transition-all duration-500 relative ${
        active 
        ? 'text-accent-safe -translate-y-4 shadow-2xl' 
        : 'text-text-dim'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="mobileActive"
          className="absolute inset-0 bg-accent-safe/10 rounded-2xl border border-accent-safe/30"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <div className="relative z-10">
        {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${active ? 'fill-current' : ''}` })}
      </div>
    </button>
  );
}
