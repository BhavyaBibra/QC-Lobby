import { getAuthToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE = `${API_URL}/v1`;

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = await getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// QC Comment type for detailed QC results
export interface QCComment {
  timestamp: string;
  timestamp_sec: number;
  category: string;
  description: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
}

// Video info within QC results
export interface QCVideoInfo {
  resolution?: string;
  fps?: number;
  audio?: boolean;
}

// QC Result summary
export interface QCSummary {
  total_issues: number;
  by_category: Record<string, number>;
}

// Full QC Result structure
export interface QCResult {
  video_info?: QCVideoInfo;
  comments?: QCComment[];
  summary?: QCSummary;
  // Legacy fields for backwards compatibility
  resolution?: string;
  fps?: number;
  audio?: boolean;
}

// Artifact URLs for downloadable reports
export interface JobArtifacts {
  pdf_url?: string;
  edl_url?: string;
  xml_url?: string;
}

// Job types
export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  qc_mode: 'polisher' | 'guardian';
  duration_sec: number;
  credits_used: number;
  video_url: string;
  thumbnail_url?: string;
  qc_result?: QCResult;
  artifacts?: JobArtifacts;
  created_at: string;
  team_id: string;
}

export interface CreateJobRequest {
  video_url: string;
  duration_sec: number;
  qc_mode: 'polisher' | 'guardian';
  thumbnail_url?: string;
}

// Onboarding types
export interface OnboardingRequest {
  plan_type: 'freelancer' | 'agency';
}

export interface OnboardingResponse {
  user_id: string;
  team_id: string;
  plan_type: string;
  credits: number;
  is_new_user: boolean;
}

export interface UserProfile {
  user_id: string;
  email: string;
  team_id: string;
  team_name: string;
  plan_type: string;
  credits: number;
}

// Jobs API
export const jobsApi = {
  list: async (): Promise<Job[]> => {
    return apiRequest<Job[]>('/jobs');
  },

  get: async (jobId: string): Promise<Job> => {
    return apiRequest<Job>(`/jobs/${jobId}`);
  },

  create: async (job: CreateJobRequest): Promise<Job> => {
    return apiRequest<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  },
};

// Onboarding API
export const onboardingApi = {
  onboard: async (request: OnboardingRequest): Promise<OnboardingResponse> => {
    return apiRequest<OnboardingResponse>('/onboard', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getProfile: async (): Promise<UserProfile> => {
    return apiRequest<UserProfile>('/profile');
  },
};
