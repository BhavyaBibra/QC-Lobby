'use client';

import { useState } from 'react';
import { jobsApi, CreateJobRequest } from '@/lib/api';

export default function JobForm() {
  const [formData, setFormData] = useState<CreateJobRequest>({
    video_url: '',
    duration_sec: 0,
    qc_mode: 'polisher',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await jobsApi.create(formData);
      setSuccess(true);
      setFormData({
        video_url: '',
        duration_sec: 0,
        qc_mode: 'polisher',
      });
      // Trigger refresh of job list
      window.dispatchEvent(new Event('jobCreated'));
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const calculateCredits = () => {
    if (formData.duration_sec <= 0) return 0;
    const creditsPerSecond = formData.qc_mode === 'polisher' ? 1 : 2;
    return formData.duration_sec * creditsPerSecond;
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Job</h2>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Job created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="video_url" className="block text-sm font-medium text-gray-700">
            Video URL
          </label>
          <input
            type="url"
            id="video_url"
            required
            value={formData.video_url}
            onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
            placeholder="https://example.com/video.mp4"
          />
        </div>

        <div>
          <label htmlFor="duration_sec" className="block text-sm font-medium text-gray-700">
            Duration (seconds)
          </label>
          <input
            type="number"
            id="duration_sec"
            required
            min="1"
            value={formData.duration_sec || ''}
            onChange={(e) => setFormData({ ...formData, duration_sec: parseInt(e.target.value) || 0 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          />
        </div>

        <div>
          <label htmlFor="qc_mode" className="block text-sm font-medium text-gray-700">
            QC Mode
          </label>
          <select
            id="qc_mode"
            value={formData.qc_mode}
            onChange={(e) => setFormData({ ...formData, qc_mode: e.target.value as 'polisher' | 'guardian' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          >
            <option value="polisher">Polisher (1 credit/sec)</option>
            <option value="guardian">Guardian (2 credits/sec)</option>
          </select>
        </div>

        {formData.duration_sec > 0 && (
          <div className="bg-gray-50 rounded-md p-3">
            <div className="text-sm text-gray-600">
              Estimated cost: <span className="font-semibold text-gray-900">{calculateCredits()} credits</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !formData.video_url || formData.duration_sec <= 0}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Job'}
        </button>
      </form>
    </div>
  );
}
