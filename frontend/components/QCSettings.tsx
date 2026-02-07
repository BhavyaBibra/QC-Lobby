'use client';

import { useState } from 'react';

export default function QCSettings() {
  const [qcMode, setQcMode] = useState<'polisher' | 'guardian'>('guardian');
  const [referenceBrief, setReferenceBrief] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-white font-bold text-lg">QC Settings</h2>
        <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
          <span className="text-gray-400 text-xs">ℹ️</span>
        </div>
      </div>

      {/* Analysis Mode */}
      <div>
        <h3 className="text-gray-400 text-sm mb-3">Analysis Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Polisher Card */}
          <button
            onClick={() => setQcMode('polisher')}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              qcMode === 'polisher'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            {qcMode === 'polisher' && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xl">⭐</span>
              <span className={`font-semibold text-sm ${qcMode === 'polisher' ? 'text-white' : 'text-gray-400'}`}>
                Polisher
              </span>
              <span className="text-xs text-gray-400">1 credit/sec</span>
            </div>
          </button>

          {/* Guardian Card */}
          <button
            onClick={() => setQcMode('guardian')}
            className={`relative p-4 rounded-xl border-2 transition-all ${
              qcMode === 'guardian'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            {qcMode === 'guardian' && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></div>
            )}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xl">🛡️</span>
              <span className={`font-semibold text-sm ${qcMode === 'guardian' ? 'text-white' : 'text-gray-400'}`}>
                Guardian
              </span>
              <span className="text-xs text-gray-400">2 credits/sec</span>
            </div>
          </button>
        </div>
      </div>

      {/* Reference Brief (only for Guardian) */}
      {qcMode === 'guardian' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-gray-400 text-sm">Reference Brief</h3>
            <span className="text-gray-500">📄</span>
          </div>
          
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-sm flex items-center gap-2 transition-colors">
              <span>📋</span>
              <span>Paste</span>
            </button>
            <button className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-sm flex items-center gap-2 transition-colors">
              <span>⬆️</span>
              <span>Upload</span>
            </button>
          </div>

          <textarea
            value={referenceBrief}
            onChange={(e) => setReferenceBrief(e.target.value)}
            placeholder="Describe your brand guidelines, required elements, or specific checks you need..."
            className="w-full h-32 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
          />

          <p className="text-gray-400 text-xs">
            Guardian mode will check your video against these requirements
          </p>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <p className="text-purple-200 text-sm leading-relaxed">
              <span className="font-semibold text-purple-100">Guardian:</span> Everything in Polisher, plus UI safe-zones, potential risk, and brand briefing match.
            </p>
          </div>
        </div>
      )}

      {/* Polisher Description */}
      {qcMode === 'polisher' && (
        <p className="text-gray-400 text-sm">
          Polisher: Proofread subtitles, check spelling and grammar in 30+ languages.
        </p>
      )}
    </div>
  );
}
