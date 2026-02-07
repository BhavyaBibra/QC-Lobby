'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { jobsApi, Job, QCComment } from '@/lib/api';
import Link from 'next/link';

// Category color mapping
const getCategoryStyle = (category: string) => {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    Grammar: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/50' },
    Brand: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/50' },
    Audio: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/50' },
    Visual: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/50' },
    Technical: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/50' },
    Copyright: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/50' },
    SafeZone: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/50' },
    Compliance: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/50' },
  };
  return styles[category] || { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/50' };
};

// Severity icon and color
const getSeverityStyle = (severity: string) => {
  switch (severity) {
    case 'error':
      return { icon: '●', color: 'text-red-400', bg: 'bg-red-500/20' };
    case 'warning':
      return { icon: '●', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    case 'info':
    default:
      return { icon: '●', color: 'text-blue-400', bg: 'bg-blue-500/20' };
  }
};

export default function JobResultPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCommentIndex, setActiveCommentIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadJob();
  }, [jobId]);

  const checkAuthAndLoadJob = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const jobData = await jobsApi.get(jobId);
      setJob(jobData);
    } catch (err: any) {
      console.error('Failed to load job:', err);
      setError(err.message || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  // Get filename from video URL
  const getFilename = (videoUrl: string): string => {
    const parts = videoUrl.split('/');
    let filename = parts[parts.length - 1] || 'video.mp4';
    if (filename.startsWith('mock://')) {
      filename = filename.replace('mock://', '');
    }
    return filename;
  };

  // Format time to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle video time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Seek to specific timestamp - CLICKABLE TIMESTAMP HANDLER
  const seekToTime = (timestampSec: number, commentIndex?: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestampSec;
      videoRef.current.play();
      setIsPlaying(true);
    }
    if (commentIndex !== undefined) {
      setActiveCommentIndex(commentIndex);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && job) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * job.duration_sec;
    }
  };

  // Get comments with optional filtering
  const getFilteredComments = (): QCComment[] => {
    const comments = job?.qc_result?.comments || [];
    if (!filterCategory) return comments;
    return comments.filter(c => c.category === filterCategory);
  };

  // Get unique categories for filter
  const getCategories = (): string[] => {
    const comments = job?.qc_result?.comments || [];
    const categories = [...new Set(comments.map(c => c.category))];
    return categories.sort();
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0a0a0f] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-white">Loading QC Results...</div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex h-screen bg-[#0a0a0f] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-400 text-xl">Error loading job</div>
          <p className="text-gray-400">{error || 'Job not found'}</p>
          <Link
            href="/history"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ← Back to History
          </Link>
        </div>
      </div>
    );
  }

  const comments = getFilteredComments();
  const totalComments = job.qc_result?.comments?.length || 0;
  const summary = job.qc_result?.summary;
  const categories = getCategories();

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/history"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-white font-semibold text-lg">{getFilename(job.video_url)}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      job.qc_mode === 'guardian'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {job.qc_mode === 'guardian' ? 'Guardian' : 'Polisher'}
                  </span>
                  <span className="text-gray-400 text-sm">{formatTime(job.duration_sec)}</span>
                  <span className="text-gray-500 text-sm">•</span>
                  <span className="text-gray-400 text-sm">{totalComments} issues found</span>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => job.artifacts?.pdf_url && window.open(job.artifacts.pdf_url, '_blank')}
                disabled={!job.artifacts?.pdf_url}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-white">PDF</span>
              </button>
              <button
                onClick={() => job.artifacts?.edl_url && window.open(job.artifacts.edl_url, '_blank')}
                disabled={!job.artifacts?.edl_url}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-white">EDL</span>
              </button>
              <button
                onClick={() => job.artifacts?.xml_url && window.open(job.artifacts.xml_url, '_blank')}
                disabled={!job.artifacts?.xml_url}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="text-white">XML</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Video Section */}
          <div className="flex-1">
            {/* Video Player */}
            <div className="bg-black rounded-xl overflow-hidden">
              <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                {job.video_url.startsWith('mock://') || job.video_url.startsWith('data:') ? (
                  // Mock video placeholder
                  <div className="relative w-full h-full flex items-center justify-center">
                    {job.thumbnail_url ? (
                      <img
                        src={job.thumbnail_url}
                        alt="Video thumbnail"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-6xl opacity-30">🎬</div>
                    )}
                    <div
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={togglePlayPause}
                    >
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                        <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Real video player
                  <video
                    ref={videoRef}
                    src={job.video_url}
                    className="w-full h-full"
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={togglePlayPause}
                  />
                )}
              </div>

              {/* Video Controls */}
              <div className="px-4 py-3 bg-[#0d0d12]">
                {/* Progress Bar */}
                <div
                  className="h-2 bg-white/20 rounded-full cursor-pointer mb-3 relative group"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(currentTime / job.duration_sec) * 100}%` }}
                  />
                  {/* Comment markers on progress bar - CLICKABLE */}
                  {(job.qc_result?.comments || []).map((comment, idx) => (
                    <div
                      key={idx}
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-500 cursor-pointer hover:scale-150 transition-transform z-10"
                      style={{ left: `${(comment.timestamp_sec / job.duration_sec) * 100}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        seekToTime(comment.timestamp_sec, idx);
                      }}
                      title={`${comment.timestamp} - ${comment.description}`}
                    />
                  ))}
                </div>

                {/* Time and Controls */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlayPause}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                      {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <span className="text-gray-400 font-mono">
                      <span className="text-white">{formatTime(currentTime)}</span>
                      <span className="mx-1">/</span>
                      <span>{formatTime(job.duration_sec)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            {summary && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                  <div className="text-3xl font-bold text-white">{summary.total_issues}</div>
                  <div className="text-gray-400 text-sm">Total Issues</div>
                </div>
                {Object.entries(summary.by_category || {}).slice(0, 3).map(([cat, count]) => {
                  const style = getCategoryStyle(cat);
                  return (
                    <div key={cat} className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                      <div className="text-3xl font-bold text-white">{count as number}</div>
                      <div className={`text-sm ${style.text}`}>{cat}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comments Panel */}
          <div className="w-96 bg-white/[0.02] border border-white/10 rounded-xl flex flex-col max-h-[calc(100vh-180px)]">
            {/* Panel Header */}
            <div className="px-4 py-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <h3 className="text-white font-semibold">Comments</h3>
                </div>
                <span className="text-gray-500 text-sm">{comments.length} shown</span>
              </div>

              {/* Category Filter */}
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => setFilterCategory(null)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filterCategory === null
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => {
                    const style = getCategoryStyle(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          filterCategory === cat
                            ? `${style.bg} ${style.text} border ${style.border}`
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No comments found.</p>
                  {filterCategory && (
                    <button
                      onClick={() => setFilterCategory(null)}
                      className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {comments.map((comment, idx) => {
                    const categoryStyle = getCategoryStyle(comment.category);
                    const severityStyle = getSeverityStyle(comment.severity);
                    const isActive = activeCommentIndex === idx;
                    
                    return (
                      <div
                        key={idx}
                        className={`p-4 cursor-pointer transition-colors border-l-4 ${
                          isActive
                            ? 'bg-blue-500/10 border-l-blue-500'
                            : 'hover:bg-white/[0.02] border-l-yellow-500/70'
                        }`}
                        onClick={() => seekToTime(comment.timestamp_sec, idx)}
                      >
                        {/* Timestamp & Category - CLICKABLE */}
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              seekToTime(comment.timestamp_sec, idx);
                            }}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors group"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-mono text-sm group-hover:underline">{comment.timestamp}</span>
                          </button>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}
                          >
                            {comment.category}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-white text-sm mb-2">{comment.description}</p>

                        {/* Suggestion */}
                        {comment.suggestion && (
                          <div className="flex items-start gap-2 text-xs text-gray-400">
                            <span className={`${severityStyle.color} mt-0.5`}>{severityStyle.icon}</span>
                            <span>{comment.suggestion}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
