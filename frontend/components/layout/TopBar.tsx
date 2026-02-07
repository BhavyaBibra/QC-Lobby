'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';

interface TopBarProps {
  userName?: string;
}

export default function TopBar({ userName }: TopBarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">Welcome back,</span>
        <span className="text-white font-medium">{userName || 'User'}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-blue-400/50 flex items-center justify-center">
          <span className="text-blue-400 text-xs font-bold">QC</span>
        </div>
        <button
          onClick={handleSignOut}
          className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
          title="Sign out"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
