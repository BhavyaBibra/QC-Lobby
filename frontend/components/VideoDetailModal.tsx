'use client';

import { useRef, useState, useEffect } from 'react';
import { Job, QCComment } from '@/lib/api';

interface VideoDetailModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

// Category color mapping
const getCategoryStyle = (category: string) => {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    Grammar: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/50' },
    Brand: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/50' },
    Audio: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/50' },
    Visual: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/50' },
    Technical: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/50' },
    Compliance: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/50' },
  };
  return styles[category] || { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/50' };
};

// Severity icon mapping
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'error':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
    default:
      return '💡';
  }
};

export default function VideoDetailModal({ job, isOpen, onClose }: VideoDetailModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Get filename from video URL
  const getFilename = (videoUrl: string): string => {
    const parts = videoUrl.split('/');
    let filename = parts[parts.length - 1] || 'video.mp4';
    if (filename.startsWith('mock://')) {
      filename = filename.replace('mock://', '');
    }
    return filename;
  };

  // Format duration to MM:SS
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

  // Seek to specific timestamp
  const seekToTime = (timestampSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestampSec;
      videoRef.current.play();
      setIsPlaying(true);
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
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * job.duration_sec;
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const comments = job.qc_result?.comments || [];
  const totalComments = comments.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold text-lg">{getFilename(job.video_url)}</h2>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                job.qc_mode === 'guardian'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              {job.qc_mode === 'guardian' ? 'Guardian' : 'Polisher'}
            </span>
            <span className="text-gray-400 text-sm">{formatTime(job.duration_sec)}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Video Section */}
          <div className="flex-1 flex flex-col bg-black">
            {/* Video Player */}
            <div className="relative flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
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
                  className="max-w-full max-h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onClick={togglePlayPause}
                />
              )}
            </div>

            {/* Video Controls */}
            <div className="px-4 py-3 bg-[#0d0d12] border-t border-white/10">
              {/* Progress Bar */}
              <div
                className="h-1 bg-white/20 rounded-full cursor-pointer mb-3 relative"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(currentTime / job.duration_sec) * 100}%` }}
                />
                {/* Comment markers on progress bar */}
                {comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-500 cursor-pointer hover:scale-150 transition-transform"
                    style={{ left: `${(comment.timestamp_sec / job.duration_sec) * 100}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      seekToTime(comment.timestamp_sec);
                    }}
                    title={comment.description}
                  />
                ))}
              </div>

              {/* Time Display */}
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
                  <span className="text-gray-400">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    <span className="mx-1">/</span>
                    <span>{formatTime(job.duration_sec)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex items-center justify-center gap-4 px-4 py-4 bg-[#0d0d12] border-t border-white/10">
              <button
                onClick={() => job.artifacts?.pdf_url && window.open(job.artifacts.pdf_url, '_blank')}
                disabled={!job.artifacts?.pdf_url}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-white text-sm">Download PDF</span>
              </button>
              <button
                onClick={() => job.artifacts?.edl_url && window.open(job.artifacts.edl_url, '_blank')}
                disabled={!job.artifacts?.edl_url}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-white text-sm">Download EDL</span>
              </button>
              <button
                onClick={() => job.artifacts?.xml_url && window.open(job.artifacts.xml_url, '_blank')}
                disabled={!job.artifacts?.xml_url}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="text-white text-sm">Download XML</span>
              </button>
            </div>
          </div>

          {/* Comments Panel */}
          <div className="w-80 border-l border-white/10 flex flex-col bg-[#0a0a0f]">
            {/* Panel Header */}
            <div className="px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h3 className="text-white font-semibold">Comments</h3>
              </div>
              <p className="text-gray-500 text-sm mt-1">{totalComments} comments found</p>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No QC comments found.</p>
                  <p className="text-sm mt-1">This video passed all checks!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {comments.map((comment, idx) => {
                    const categoryStyle = getCategoryStyle(comment.category);
                    return (
                      <div
                        key={idx}
                        className="p-4 hover:bg-white/[0.02] cursor-pointer transition-colors border-l-4 border-l-yellow-500/70"
                        onClick={() => seekToTime(comment.timestamp_sec)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1 text-gray-400 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-blue-400 font-mono">{comment.timestamp}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}
                          >
                            {comment.category}
                          </span>
                        </div>
                        <p className="text-white text-sm mb-2">{comment.description}</p>
                        {comment.suggestion && (
                          <div className="flex items-start gap-2 text-xs text-gray-400">
                            <span>{getSeverityIcon(comment.severity)}</span>
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
