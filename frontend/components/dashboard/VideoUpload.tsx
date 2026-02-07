'use client';

import { useState, useRef } from 'react';
import { jobsApi } from '@/lib/api';

interface VideoUploadProps {
  qcMode: 'polisher' | 'guardian';
  onJobCreated?: () => void | Promise<void>;
}

export default function VideoUpload({ qcMode, onJobCreated }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loadingDuration, setLoadingDuration] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get video duration and thumbnail from file
  const getVideoMetadata = (file: File): Promise<{ duration: number; thumbnail: string }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of the video, whichever is smaller
        const seekTime = Math.min(1, video.duration * 0.1);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        // Create canvas and draw the video frame
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const videoAspect = video.videoWidth / video.videoHeight;
          const canvasAspect = canvas.width / canvas.height;
          
          let drawWidth, drawHeight, offsetX, offsetY;
          
          if (videoAspect > canvasAspect) {
            drawHeight = canvas.height;
            drawWidth = drawHeight * videoAspect;
            offsetX = -(drawWidth - canvas.width) / 2;
            offsetY = 0;
          } else {
            drawWidth = canvas.width;
            drawHeight = drawWidth / videoAspect;
            offsetX = 0;
            offsetY = -(drawHeight - canvas.height) / 2;
          }
          
          ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
        }
        
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const duration = Math.ceil(video.duration);
        
        window.URL.revokeObjectURL(video.src);
        resolve({ duration, thumbnail: thumbnailDataUrl });
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setLoadingDuration(true);
    setVideoDuration(null);
    setThumbnail(null);
    
    try {
      const { duration, thumbnail } = await getVideoMetadata(file);
      setVideoDuration(duration);
      setThumbnail(thumbnail);
    } catch (err) {
      console.error('Failed to get video metadata:', err);
      setError('Could not read video. Please try another file.');
      setSelectedFile(null);
    } finally {
      setLoadingDuration(false);
    }
  };

  // Remove/clear selected file
  const handleRemoveFile = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedFile(null);
    setVideoDuration(null);
    setThumbnail(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileSelect(e.target.files[0]);
    }
  };

  // Format duration for display (MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate credits needed
  const calculateCredits = (): number => {
    if (!videoDuration) return 0;
    const creditsPerSecond = qcMode === 'polisher' ? 1 : 2;
    return videoDuration * creditsPerSecond;
  };

  const handleGetQCDone = async () => {
    if (!selectedFile || !videoDuration) {
      setError('Please select a video file first');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const videoUrl = `mock://${selectedFile.name}`;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5eb1b544-15b6-4854-8483-316477938662',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VideoUpload.tsx:handleGetQCDone',message:'Creating job with qcMode',data:{qcMode:qcMode,video_url:videoUrl,duration_sec:videoDuration},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      const job = await jobsApi.create({
        video_url: videoUrl,
        duration_sec: videoDuration,
        qc_mode: qcMode,
        thumbnail_url: thumbnail || undefined,
      });

      // Trigger refresh of active queue
      window.dispatchEvent(new CustomEvent('jobCreated', { detail: job }));
      
      // Reset form IMMEDIATELY after successful creation
      handleRemoveFile();
      
      // Notify parent to refresh credits (await to ensure it completes)
      if (onJobCreated) {
        try {
          await onJobCreated();
        } catch (refreshErr) {
          // Ignore errors from credit refresh - job was created successfully
          console.warn('Credit refresh failed, but job was created:', refreshErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* QC Logo */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">QC</span>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          selectedFile ? 'cursor-default' : 'cursor-pointer'
        } ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : selectedFile
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-white/20 hover:border-white/30 bg-white/[0.03]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/mov,video/mkv,video/x-matroska,video/quicktime,video/webm"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            selectedFile ? 'bg-green-500/20' : 'bg-white/10'
          }`}>
            {loadingDuration ? (
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : selectedFile ? (
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          <div>
            {loadingDuration ? (
              <p className="text-blue-400 font-semibold text-lg">Reading video info...</p>
            ) : selectedFile ? (
              <>
                <p className="text-green-400 font-semibold text-lg mb-1">{selectedFile.name}</p>
                {videoDuration && (
                  <p className="text-white text-sm">
                    Duration: <span className="font-bold">{formatDuration(videoDuration)}</span>
                    <span className="text-gray-400 ml-2">({videoDuration} seconds)</span>
                  </p>
                )}
                <p className="text-gray-400 text-sm mt-2">
                  Ready to analyze • {' '}
                  <button 
                    onClick={handleRemoveFile}
                    className="text-red-400 hover:text-red-300 underline"
                  >
                    Remove
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold text-lg mb-1">Drag & drop your video</p>
                <p className="text-gray-400 text-sm">or click to browse • MP4, MOV, MKV, WebM supported</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Credit Cost Preview */}
      {selectedFile && videoDuration && (
        <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Estimated Credit Cost</p>
              <p className="text-white font-bold text-xl">{calculateCredits()} credits</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">
                {qcMode === 'polisher' ? 'Polisher' : 'Guardian'} Mode
              </p>
              <p className="text-gray-500 text-xs">
                {qcMode === 'polisher' ? '1 credit/sec' : '2 credits/sec'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Info */}
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <span>▶️</span>
        <span>Max file size: 1GB</span>
        <span className="ml-2">📄</span>
      </div>

      {/* Info Message */}
      <div className="flex items-center gap-2 text-blue-400 text-sm">
        <span>ℹ️</span>
        <span>Upload lower resolution for faster QC</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Get QC Done Button */}
      <button
        onClick={handleGetQCDone}
        disabled={loading || !selectedFile || !videoDuration || loadingDuration}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </span>
        ) : (
          `Get QC Done${videoDuration ? ` (${calculateCredits()} credits)` : ''}`
        )}
      </button>
    </div>
  );
}
