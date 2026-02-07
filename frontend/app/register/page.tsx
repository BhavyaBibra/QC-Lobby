'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, signUpWithEmail, signInWithGoogle, getCurrentUser } from '@/lib/auth';
import { onboardingApi } from '@/lib/api';

type PlanType = 'freelancer' | 'agency';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'plan' | 'auth'>('plan');
  const [planType, setPlanType] = useState<PlanType>('freelancer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        router.push('/');
      }
    };
    checkUser();
  }, [router]);

  // Handle plan from URL params
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan === 'freelancer' || plan === 'agency') {
      setPlanType(plan);
      setStep('auth');
    }
  }, [searchParams]);

  const handlePlanSelect = (plan: PlanType) => {
    setPlanType(plan);
    setStep('auth');
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUpWithEmail(email, password);
      
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.user && !data.session) {
        // Email confirmation required
        setSuccess('Check your email for a confirmation link!');
        // Store plan type for after confirmation
        localStorage.setItem('qc_lobby_plan_type', planType);
        setLoading(false);
        return;
      }

      // If session exists, onboard the user
      if (data.session) {
        await completeOnboarding();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      // Store plan type for after OAuth callback
      localStorage.setItem('qc_lobby_plan_type', planType);
      console.log('Stored plan type:', planType);
      
      const { error } = await signInWithGoogle(`${window.location.origin}/auth/callback`);
      
      if (error) {
        setError(error.message);
        localStorage.removeItem('qc_lobby_plan_type');
        setLoading(false);
      }
      // Redirect happens automatically
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google');
      localStorage.removeItem('qc_lobby_plan_type');
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await onboardingApi.onboard({ plan_type: planType });
      localStorage.removeItem('qc_lobby_plan_type');
      router.push('/');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      // Still redirect to dashboard, onboarding can be completed later
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full border-2 border-blue-400 flex items-center justify-center">
              <span className="text-blue-400 text-lg font-bold">QC</span>
            </div>
            <span className="text-white text-3xl font-bold">QC</span>
            <span className="text-gray-400 text-2xl font-light italic">lobby</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">
            {step === 'plan' ? 'Choose Your Plan' : 'Create Your Account'}
          </h2>
          <p className="text-gray-400">
            {step === 'plan' 
              ? 'Start with 360 free credits' 
              : `${planType === 'freelancer' ? 'Freelancer' : 'Agency'} plan selected`}
          </p>
        </div>

        {/* Plan Selection */}
        {step === 'plan' && (
          <div className="space-y-4">
            <button
              onClick={() => handlePlanSelect('freelancer')}
              className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-xl font-semibold">Freelancer</h3>
                <span className="text-blue-400 text-sm font-medium bg-blue-500/20 px-3 py-1 rounded-full">
                  360 credits free
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Perfect for individual creators and small projects
              </p>
              <ul className="text-gray-500 text-sm space-y-1">
                <li>• Single user access</li>
                <li>• Both QC modes available</li>
                <li>• Standard support</li>
              </ul>
            </button>

            <button
              onClick={() => handlePlanSelect('agency')}
              className="w-full p-6 bg-white/[0.03] border border-white/10 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-xl font-semibold">Agency</h3>
                <span className="text-purple-400 text-sm font-medium bg-purple-500/20 px-3 py-1 rounded-full">
                  360 credits free
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Built for teams and production companies
              </p>
              <ul className="text-gray-500 text-sm space-y-1">
                <li>• Team collaboration (coming soon)</li>
                <li>• Both QC modes available</li>
                <li>• Priority support</li>
              </ul>
            </button>
          </div>
        )}

        {/* Auth Form */}
        {step === 'auth' && (
          <div className="space-y-6">
            {/* Back button */}
            <button
              onClick={() => setStep('plan')}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              ← Change plan
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Google Sign Up */}
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-black text-gray-500">or continue with email</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
