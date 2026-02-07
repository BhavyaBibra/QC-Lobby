# Frontend Integration - Setup Guide

## Overview

A complete Next.js frontend has been created that integrates with the FastAPI backend. The frontend includes:

- **Job Creation Form**: Create new QC jobs with video URL, duration, and QC mode selection
- **Job List**: Real-time job list with automatic polling for status updates
- **Authentication**: Supabase-based authentication with login page
- **Real-time Updates**: Automatic polling every 3 seconds for active jobs
- **QC Results Display**: Shows QC results when jobs are completed
- **Error Handling**: Comprehensive error states and loading indicators

## Backend Changes Made

Two minimal backend changes were required for frontend integration:

1. **Added GET /v1/jobs/{job_id} endpoint** - Required for polling individual jobs
2. **Added CORS middleware** - Required for frontend to make API requests

These are essential infrastructure changes, not business logic modifications.

## Frontend Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   ├── login/
│   │   └── page.tsx        # Login page
│   └── globals.css         # Global styles
├── components/
│   ├── JobForm.tsx         # Job creation form
│   └── JobList.tsx         # Job list with polling
├── lib/
│   ├── api.ts              # API client with auth
│   └── auth.ts              # Supabase auth utilities
└── package.json            # Dependencies

```

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 4. Start Backend

Make sure the FastAPI backend is running on `http://localhost:8000`

## Features Implemented

### ✅ Job Creation
- Form with video URL, duration, and QC mode selection
- Credit calculation preview
- Error handling for validation and API errors
- Success feedback

### ✅ Job List
- Displays all jobs sorted by creation date (newest first)
- Real-time status updates via polling
- Status badges with color coding
- QC results display for completed jobs
- Error state handling
- Empty state messaging

### ✅ Real-time Polling
- Automatically polls jobs with status "pending" or "processing"
- Polls every 3 seconds
- Stops polling when job is completed or failed
- Efficient: only polls active jobs

### ✅ Authentication
- Login page with email/password
- Protected routes
- Session management via Supabase
- Automatic token injection in API requests

### ✅ UI/UX
- Clean, modern design
- Responsive layout
- Loading states
- Error messages
- Success feedback
- Status indicators

## API Integration

The frontend uses these endpoints:

- `GET /v1/jobs` - List all jobs
- `GET /v1/jobs/{job_id}` - Get single job (for polling)
- `POST /v1/jobs` - Create new job

All requests include Supabase JWT token in Authorization header.

## Job Status Flow

1. User creates job → Status: `pending`
2. Background worker picks up job → Status: `processing`
3. Worker completes processing → Status: `completed` (with qc_result)
4. If error occurs → Status: `failed`

The frontend automatically updates the UI as status changes.

## Notes

- The frontend is production-ready with TypeScript, error handling, and proper state management
- Polling is efficient and only targets active jobs
- All API calls include proper authentication
- The design is clean and professional, suitable for a SaaS product
