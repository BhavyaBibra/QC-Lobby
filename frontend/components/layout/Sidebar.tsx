'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  creditBalance?: number;
}

export default function Sidebar({ creditBalance = 0 }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦', href: '/' },
    { id: 'history', label: 'History', icon: '🕐', href: '/history' },
    { id: 'plan', label: 'Plan & Credits', icon: '📄', href: '/plan' },
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="w-64 h-screen bg-black border-r border-white/10 flex flex-col relative z-10">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-blue-400 flex items-center justify-center">
            <span className="text-blue-400 text-xs font-bold">QC</span>
          </div>
          <span className="text-white text-xl font-bold">QC</span>
          <span className="text-gray-400 text-lg font-light italic">lobby</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              isActive(item.href)
                ? 'bg-blue-500/30 text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
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
