'use client';

import { useState, useEffect, useCallback } from 'react';
import { jobsApi, Job } from '@/lib/api';

export default function JobList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async () => {
    try {
      const data = await jobsApi.list();
      setJobs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setError('');
      
      // Start polling for active jobs
      const activeJobIds = data
        .filter(job => job.status === 'pending' || job.status === 'processing')
        .map(job => job.id);
      setPollingJobs(new Set(activeJobIds));
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Listen for job creation events
  useEffect(() => {
    const handleJobCreated = () => {
      fetchJobs();
    };
    window.addEventListener('jobCreated', handleJobCreated);
    return () => window.removeEventListener('jobCreated', handleJobCreated);
  }, [fetchJobs]);

  // Poll active jobs
  useEffect(() => {
    if (pollingJobs.size === 0) return;

    const pollInterval = setInterval(async () => {
      for (const jobId of pollingJobs) {
        try {
          const updatedJob = await jobsApi.get(jobId);
          setJobs(prevJobs => {
            const updated = prevJobs.map(job => 
              job.id === jobId ? updatedJob : job
            );
            return updated.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });

          // Stop polling if job is completed or failed
          if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
            setPollingJobs(prev => {
              const next = new Set(prev);
              next.delete(jobId);
              return next;
            });
          }
        } catch (err) {
          console.error(`Failed to poll job ${jobId}:`, err);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [pollingJobs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Jobs</h2>
        <div className="text-center py-8 text-gray-500">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Jobs</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Jobs</h2>
        <button
          onClick={fetchJobs}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Refresh
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No jobs yet. Create your first job to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {job.qc_mode === 'polisher' ? 'Polisher' : 'Guardian'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 break-all">{job.video_url}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-1 font-medium">{job.duration_sec}s</span>
                </div>
                <div>
                  <span className="text-gray-500">Credits:</span>
                  <span className="ml-1 font-medium">{job.credits_used}</span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-1 font-medium">{formatDate(job.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">ID:</span>
                  <span className="ml-1 font-mono text-xs">{job.id.slice(0, 8)}...</span>
                </div>
              </div>

              {job.status === 'completed' && job.qc_result && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">QC Results</h3>
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Resolution:</span>
                        <span className="ml-1 font-medium">
                          {job.qc_result.video_info?.resolution || job.qc_result.resolution || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">FPS:</span>
                        <span className="ml-1 font-medium">
                          {job.qc_result.video_info?.fps || job.qc_result.fps || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Audio:</span>
                        <span className="ml-1 font-medium">
                          {(job.qc_result.video_info?.audio !== undefined 
                            ? (job.qc_result.video_info.audio ? 'Yes' : 'No')
                            : job.qc_result.audio !== undefined 
                              ? (job.qc_result.audio ? 'Yes' : 'No') 
                              : 'N/A')}
                        </span>
                      </div>
                    </div>
                    {job.qc_result.comments && job.qc_result.comments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-gray-500 text-sm">
                          {job.qc_result.comments.length} QC {job.qc_result.comments.length === 1 ? 'issue' : 'issues'} found
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {job.status === 'failed' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    Job processing failed
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
