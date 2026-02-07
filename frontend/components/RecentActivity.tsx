'use client';

interface Job {
  id: string;
  filename: string;
  duration: string;
  qcMode: 'polisher' | 'guardian';
  status: 'completed' | 'processing';
  timeAgo: string;
  thumbnail?: string;
}

interface RecentActivityProps {
  jobs?: Job[];
}

export default function RecentActivity({ jobs }: RecentActivityProps) {
  // Mock data
  const mockJobs: Job[] = jobs || [
    {
      id: '1',
      filename: 'Anti_Burnout_Setup.mp4',
      duration: '04:32',
      qcMode: 'guardian',
      status: 'completed',
      timeAgo: '3d ago',
    },
    {
      id: '2',
      filename: 'Self_Development_Day11.mp4',
      duration: '01:45',
      qcMode: 'polisher',
      status: 'completed',
      timeAgo: '3d ago',
    },
    {
      id: '3',
      filename: '45_Day_Sprint_Day0.mp4',
      duration: '00:30',
      qcMode: 'polisher',
      status: 'completed',
      timeAgo: '4d ago',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base">☰</span>
        <h3 className="text-white font-semibold text-lg">Recent Activity</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="relative h-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <div className="absolute top-2 left-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    job.qcMode === 'guardian'
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                      : 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
                  }`}
                >
                  {job.qcMode === 'guardian' ? 'Guardian' : 'Polisher'}
                </span>
              </div>
              <div className="absolute top-2 right-2 text-white text-sm font-medium">
                {job.duration}
              </div>
              <div className="text-4xl opacity-50">🎬</div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
              <h4 className="text-white font-medium text-sm truncate">{job.filename}</h4>
              <p className="text-gray-400 text-xs">{job.timeAgo}</p>
              
              {/* File types */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <span>📄</span>
                  <span>.xml</span>
                </span>
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <span>📄</span>
                  <span>.edl</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
