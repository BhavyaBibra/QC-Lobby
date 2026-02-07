'use client';

import { useState, useEffect, useCallback } from 'react';
import { jobsApi, Job } from '@/lib/api';

export default function ActiveQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  const fetchActiveJobs = useCallback(async () => {
    try {
      const allJobs = await jobsApi.list();
      const activeJobs = allJobs.filter(
        (job) => job.status === 'pending' || job.status === 'processing'
      );
      setJobs(activeJobs);

      // Update progress for processing jobs
      activeJobs.forEach((job) => {
        if (job.status === 'processing') {
          try {
            // Initialize progress based on time since creation
            const createdAt = new Date(job.created_at).getTime();
            const now = Date.now();
            const elapsed = (now - createdAt) / 1000; // seconds
            const estimatedDuration = 15; // 15 seconds for processing
            const progress = Math.min(100, Math.floor((elapsed / estimatedDuration) * 100));
            setProgressMap((prev) => ({ ...prev, [job.id]: progress }));
          } catch (e) {
            // Ignore date parsing errors
            console.error('Error calculating progress:', e);
          }
        }
      });
    } catch (error) {
      // Silently fail on polling errors - don't show error to user
      console.warn('Failed to fetch jobs (will retry):', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveJobs();
    const interval = setInterval(() => {
      fetchActiveJobs();
    }, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for new job creation
  useEffect(() => {
    const handleJobCreated = () => {
      fetchActiveJobs();
    };
    window.addEventListener('jobCreated', handleJobCreated as EventListener);
    return () => window.removeEventListener('jobCreated', handleJobCreated as EventListener);
  }, [fetchActiveJobs]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-white font-semibold text-lg">Active Queue</h3>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (jobs.length === 0) return null;

  const processingCount = jobs.filter((j) => j.status === 'processing').length;

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-lg">
        Active Queue ({processingCount} processing)
      </h3>
      
      <div className="space-y-3">
        {jobs.map((job) => {
          const progress = progressMap[job.id] || 0;
          const filename = job.video_url.split('/').pop() || 'video.mp4';

          return (
            <div
              key={job.id}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Thumbnail or fallback icon */}
                  {job.thumbnail_url ? (
                    <img 
                      src={job.thumbnail_url} 
                      alt="Video thumbnail"
                      className="w-12 h-8 object-cover rounded"
                    />
                  ) : (
                    <span className="text-2xl">🎬</span>
                  )}
                  <div>
                    <span className="text-white font-medium block">{filename}</span>
                    <span className="text-gray-500 text-xs">{job.duration_sec}s</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    job.qc_mode === 'guardian'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {job.qc_mode === 'guardian' ? 'Guardian' : 'Polisher'}
                </span>
              </div>

              {job.status === 'pending' && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <span className="animate-pulse">⏳</span>
                  <span className="text-sm font-medium">Pending...</span>
                </div>
              )}

              {job.status === 'processing' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-400">Processing...</span>
                    <span className="text-white font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
