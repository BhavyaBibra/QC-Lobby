'use client';

interface ActiveQueueProps {
  jobs?: Array<{
    id: string;
    filename: string;
    status: 'uploading' | 'processing';
    progress?: number;
    qcMode: 'polisher' | 'guardian';
  }>;
}

export default function ActiveQueue({ jobs = [] }: ActiveQueueProps) {
  // Mock data
  const mockJobs = jobs.length > 0 ? jobs : [
    {
      id: '1',
      filename: 'C&N reel 1.mp4',
      status: 'uploading' as const,
      progress: 61,
      qcMode: 'guardian' as const,
    },
  ];

  if (mockJobs.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-lg">
        Active Queue ({mockJobs.filter(j => j.status === 'processing').length} processing)
      </h3>
      
      <div className="space-y-3">
        {mockJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎬</span>
                <span className="text-white font-medium">{job.filename}</span>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  job.qcMode === 'guardian'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {job.qcMode === 'guardian' ? 'Guardian' : 'Polisher'}
              </span>
            </div>

            {job.status === 'uploading' && job.progress !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Uploading...</span>
                  <span className="text-white font-medium">{job.progress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {job.status === 'processing' && (
              <div className="flex items-center gap-2 text-blue-400">
                <span className="animate-pulse">⏳</span>
                <span className="text-sm font-medium">Processing...</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
