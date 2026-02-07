'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/auth';
import { onboardingApi } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Supabase to process the OAuth callback
        // The hash contains the tokens
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          return;
        }

        // If no session yet, wait and retry
        if (!session) {
          setStatus('Completing authentication...');
          
          // Wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession) {
              subscription.unsubscribe();
              await completeOnboarding();
            }
          });

          // Also set a timeout to check again
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              subscription.unsubscribe();
              await completeOnboarding();
            } else {
              setError('Authentication timed out. Please try again.');
            }
          }, 5000);
          
          return;
        }

        await completeOnboarding();
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
      }
    };

    const completeOnboarding = async () => {
      setStatus('Setting up your account...');
      
      try {
        // Wait a moment for the session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const user = await getCurrentUser();
        if (!user) {
          setError('No user found. Please try signing in again.');
          return;
        }

        // Get plan type from localStorage (set during registration)
        const planType = localStorage.getItem('qc_lobby_plan_type') as 'freelancer' | 'agency' | null;
        
        console.log('Plan type from localStorage:', planType);
        
        // Try to get existing profile first
        try {
          const profile = await onboardingApi.getProfile();
          console.log('Existing profile found:', profile);
          // User already has profile, redirect to dashboard
          localStorage.removeItem('qc_lobby_plan_type');
          setStatus('Redirecting to dashboard...');
          router.replace('/');
          return;
        } catch (profileError: any) {
          console.log('No existing profile, creating new one');
          // Profile doesn't exist, need to onboard
        }

        // Create profile with onboarding
        const selectedPlan = planType || 'freelancer';
        console.log('Creating profile with plan:', selectedPlan);
        
        const result = await onboardingApi.onboard({ plan_type: selectedPlan });
        console.log('Onboarding result:', result);
        
        localStorage.removeItem('qc_lobby_plan_type');
        
        setStatus('Redirecting to dashboard...');
        router.replace('/');
      } catch (err: any) {
        console.error('Onboarding error:', err);
        setError(`Failed to set up account: ${err.message}`);
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-400 text-lg">{error}</div>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="text-blue-400 hover:text-blue-300"
            >
              Back to login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-gray-400 hover:text-gray-300"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div className="text-white text-lg">{status}</div>
      </div>
    </div>
  );
}
