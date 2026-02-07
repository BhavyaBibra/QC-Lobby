'use client';

import { useState, useRef } from 'react';

export default function VideoUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop
  };

  const handleClick = () => {
    fileInputRef.current?.click();
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
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/20 hover:border-white/30 bg-white/[0.03]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/mov,video/mkv"
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-lg mb-1">Drag & drop your video</p>
            <p className="text-gray-400 text-sm">or click to browse • MP4, MOV, MKV supported</p>
          </div>
        </div>
      </div>

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

      {/* Get QC Done Button */}
      <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors">
        Get QC Done
      </button>
    </div>
  );
}
