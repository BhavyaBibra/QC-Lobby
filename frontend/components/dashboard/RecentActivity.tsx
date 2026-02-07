'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jobsApi, Job } from '@/lib/api';

export default function RecentActivity() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompletedJobs = useCallback(async () => {
    try {
      const allJobs = await jobsApi.list();
      const completedJobs = allJobs
        .filter((job) => job.status === 'completed')
        .sort((a, b) => {
          try {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          } catch {
            return 0;
          }
        })
        .slice(0, 6); // Show latest 6
      setJobs(completedJobs);
    } catch (error) {
      // Silently fail on polling errors - keep existing data
      console.warn('Failed to fetch jobs (will retry):', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompletedJobs();
    const interval = setInterval(() => {
      fetchCompletedJobs();
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">☰</span>
          <h3 className="text-white font-semibold text-lg">Recent Activity</h3>
        </div>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-base">☰</span>
          <h3 className="text-white font-semibold text-lg">Recent Activity</h3>
        </div>
        <div className="text-gray-400 text-sm">No completed jobs yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base">☰</span>
        <h3 className="text-white font-semibold text-lg">Recent Activity</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {jobs.map((job) => {
          const filename = job.video_url.split('/').pop() || 'video.mp4';
          const commentsCount = job.qc_result?.comments?.length || 0;

          return (
            <div
              key={job.id}
              className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
            >
              {/* Thumbnail */}
              <div
                className="relative h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => router.push(`/history/${job.id}`)}
              >
                {/* Video Thumbnail or Fallback */}
                {job.thumbnail_url ? (
                  <img 
                    src={job.thumbnail_url} 
                    alt="Video thumbnail"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl opacity-50">🎬</div>
                )}
                
                {/* Overlay gradient for better text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
                
                {/* QC Mode Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium backdrop-blur-sm ${
                      job.qc_mode === 'guardian'
                        ? 'bg-purple-500/50 text-purple-100 border border-purple-400/50'
                        : 'bg-blue-500/50 text-blue-100 border border-blue-400/50'
                    }`}
                  >
                    {job.qc_mode === 'guardian' ? 'Guardian' : 'Polisher'}
                  </span>
                </div>
                
                {/* Duration Badge */}
                <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white text-sm font-medium px-2 py-0.5 rounded">
                  {formatDuration(job.duration_sec)}
                </div>
                
                {/* Play icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <h4 className="text-white font-medium text-sm truncate">{filename}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-xs">{formatTimeAgo(job.created_at)}</p>
                  {commentsCount > 0 && (
                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      {commentsCount} {commentsCount === 1 ? 'issue' : 'issues'}
                    </span>
                  )}
                </div>
                
                {/* File types and view button */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      <span>📄</span>
                      <span>.xml</span>
                    </span>
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      <span>📄</span>
                      <span>.edl</span>
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/history/${job.id}`);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View Report →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
