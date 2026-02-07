'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { onboardingApi, UserProfile } from '@/lib/api';
import SidebarComponent from '@/components/layout/Sidebar';
import TopBarComponent from '@/components/layout/TopBar';
import VideoUploadComponent from '@/components/dashboard/VideoUpload';
import QCSettingsComponent from '@/components/dashboard/QCSettings';
import ActiveQueueComponent from '@/components/dashboard/ActiveQueue';
import RecentActivityComponent from '@/components/dashboard/RecentActivity';

export default function Dashboard() {
  const router = useRouter();
  const [qcMode, setQcMode] = useState<'polisher' | 'guardian'>('guardian');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkAuthAndLoadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthAndLoadProfile = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Try to load profile
      try {
        const userProfile = await onboardingApi.getProfile();
        setProfile(userProfile);
        setLoading(false);
      } catch (profileError: any) {
        console.log('Profile not found, checking if onboarding needed');
        
        // Check if there's a stored plan type (user came from OAuth)
        const planType = localStorage.getItem('qc_lobby_plan_type') as 'freelancer' | 'agency' | null;
        
        if (planType) {
          // Complete onboarding with stored plan
          try {
            console.log('Completing onboarding with plan:', planType);
            await onboardingApi.onboard({ plan_type: planType });
            localStorage.removeItem('qc_lobby_plan_type');
            const userProfile = await onboardingApi.getProfile();
            setProfile(userProfile);
            setLoading(false);
          } catch (onboardError) {
            console.error('Onboarding failed:', onboardError);
            setNeedsOnboarding(true);
            setLoading(false);
          }
        } else {
          // No stored plan, need to select one
          setNeedsOnboarding(true);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  // Handle plan selection for users who need onboarding
  const [onboardingError, setOnboardingError] = useState('');
  
  const handleSelectPlan = async (planType: 'freelancer' | 'agency') => {
    setLoading(true);
    setOnboardingError('');
    try {
      await onboardingApi.onboard({ plan_type: planType });
      const userProfile = await onboardingApi.getProfile();
      setProfile(userProfile);
      setNeedsOnboarding(false);
    } catch (error: any) {
      console.error('Failed to complete onboarding:', error);
      setOnboardingError(error.message || 'Failed to set up account');
      setLoading(false);
    }
  };

  // Refresh credits after job creation
  const refreshProfile = async () => {
    try {
      const userProfile = await onboardingApi.getProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  // Show plan selection if user needs onboarding
  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-full border-2 border-blue-400 flex items-center justify-center">
                <span className="text-blue-400 text-lg font-bold">QC</span>
              </div>
              <span className="text-white text-3xl font-bold">QC</span>
              <span className="text-gray-400 text-2xl font-light italic">lobby</span>
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Welcome! Choose Your Plan</h2>
            <p className="text-gray-400">Start with 360 free credits</p>
          </div>

          {onboardingError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
              {onboardingError}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => handleSelectPlan('freelancer')}
              className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-xl font-semibold">Freelancer</h3>
                <span className="text-blue-400 text-sm font-medium bg-blue-500/20 px-3 py-1 rounded-full">
                  360 credits free
                </span>
              </div>
              <p className="text-gray-400 text-sm">Perfect for individual creators</p>
            </button>

            <button
              onClick={() => handleSelectPlan('agency')}
              className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-xl font-semibold">Agency</h3>
                <span className="text-purple-400 text-sm font-medium bg-purple-500/20 px-3 py-1 rounded-full">
                  360 credits free
                </span>
              </div>
              <p className="text-gray-400 text-sm">Built for teams and production companies</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Left Sidebar */}
      <SidebarComponent creditBalance={profile?.credits || 0} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBarComponent userName={profile?.email?.split('@')[0]} />

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column - Video Upload */}
              <div className="lg:col-span-2 space-y-6">
                <VideoUploadComponent 
                  qcMode={qcMode} 
                  onJobCreated={refreshProfile}
                />
                
                {/* Active Queue */}
                <ActiveQueueComponent />
              </div>

              {/* Right Column - QC Settings */}
              <div className="lg:col-span-1">
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <QCSettingsComponent qcMode={qcMode} onQcModeChange={setQcMode} />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <RecentActivityComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
