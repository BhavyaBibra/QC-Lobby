'use client';

import { useState } from 'react';

interface SidebarProps {
  creditBalance?: number;
}

export default function Sidebar({ creditBalance = 1800 }: SidebarProps) {
  const [activeNav, setActiveNav] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'history', label: 'History', icon: '🕐' },
    { id: 'plan', label: 'Plan & Credits', icon: '📄' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="w-64 h-screen bg-[#0a0a0a] border-r border-white/10 flex flex-col relative z-10">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-blue-400 flex items-center justify-center">
            <span className="text-blue-400 text-xs font-bold">QC</span>
          </div>
          <span className="text-white text-xl font-bold">QC</span>
          <span className="text-gray-400 text-lg font-light italic">lobby</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeNav === item.id
                ? 'bg-blue-500/30 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Credit Balance Card */}
      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400 text-sm">Credit Balance</span>
            <span className="text-yellow-400">⭐</span>
          </div>
          <div className="text-white text-3xl font-bold mb-4">
            {creditBalance.toLocaleString()}
          </div>
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <span>📄</span>
            <span>Buy Credits</span>
          </button>
        </div>
      </div>
    </div>
  );
}
