'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { jobsApi, Job, onboardingApi, UserProfile } from '@/lib/api';
import SidebarComponent from '@/components/layout/Sidebar';

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load profile for sidebar
      try {
        const userProfile = await onboardingApi.getProfile();
        setProfile(userProfile);
      } catch (error) {
        console.warn('Failed to load profile:', error);
      }

      // Load all completed jobs
      await fetchJobs();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const allJobs = await jobsApi.list();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5eb1b544-15b6-4854-8483-316477938662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'history/page.tsx:fetchJobs',message:'Jobs fetched from API',data:{totalJobs:allJobs.length,jobs:allJobs.map(j=>({id:j.id,qc_mode:j.qc_mode,status:j.status}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      // Filter only completed jobs and sort by date (newest first)
      const completedJobs = allJobs
        .filter((job) => job.status === 'completed')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setJobs(completedJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get filename from video_url
  const getFilename = (videoUrl: string): string => {
    const parts = videoUrl.split('/');
    let filename = parts[parts.length - 1] || 'video.mp4';
    // Remove mock:// prefix if present
    if (filename.startsWith('mock://')) {
      filename = filename.replace('mock://', '');
    }
    return filename;
  };

  // Filter jobs by search query
  const filteredJobs = jobs.filter((job) => {
    const filename = getFilename(job.video_url).toLowerCase();
    return filename.includes(searchQuery.toLowerCase());
  });

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

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Left Sidebar */}
      <SidebarComponent creditBalance={profile?.credits || 0} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-white text-3xl font-bold">Video History</h1>
              <p className="text-gray-400 mt-1">All your previously analyzed videos</p>
            </div>
            
            {/* User icon */}
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 mb-6">
            <div className="relative max-w-md">
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 text-gray-400 text-sm font-medium">
              <div className="col-span-4">Video</div>
              <div className="col-span-1">Duration</div>
              <div className="col-span-2">Mode</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1">Report</div>
              <div className="col-span-2">Downloads</div>
            </div>

            {/* Table Body */}
            {filteredJobs.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                {searchQuery ? 'No videos found matching your search' : 'No completed videos yet'}
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center"
                >
                  {/* Video (Thumbnail + Filename) - Navigate to results page */}
                  <div
                    className="col-span-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => router.push(`/history/${job.id}`)}
                  >
                    {job.thumbnail_url ? (
                      <img
                        src={job.thumbnail_url}
                        alt="Video thumbnail"
                        className="w-16 h-10 object-cover rounded-lg hover:ring-2 hover:ring-blue-500/50 transition-all"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center hover:ring-2 hover:ring-blue-500/50 transition-all">
                        <span className="text-lg">🎬</span>
                      </div>
                    )}
                    <span className="text-white font-medium truncate hover:text-blue-300 transition-colors">
                      {getFilename(job.video_url)}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="col-span-1 flex items-center gap-1 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatDuration(job.duration_sec)}</span>
                  </div>

                  {/* Mode */}
                  <div className="col-span-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        job.qc_mode === 'guardian'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {job.qc_mode === 'guardian' ? 'Guardian' : 'Polisher'}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-gray-400 text-sm">
                    {formatDate(job.created_at)}
                  </div>

                  {/* Report - Navigate to results page */}
                  <div className="col-span-1">
                    <button
                      onClick={() => router.push(`/history/${job.id}`)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-400 hover:text-blue-300"
                      title="View QC Report"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>

                  {/* Downloads */}
                  <div className="col-span-2 flex items-center gap-3">
                    <button
                      onClick={() => job.artifacts?.xml_url && window.open(job.artifacts.xml_url, '_blank')}
                      disabled={!job.artifacts?.xml_url}
                      className="flex items-center gap-1 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm">.xml</span>
                    </button>
                    <button
                      onClick={() => job.artifacts?.edl_url && window.open(job.artifacts.edl_url, '_blank')}
                      disabled={!job.artifacts?.edl_url}
                      className="flex items-center gap-1 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="text-sm">.edl</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
