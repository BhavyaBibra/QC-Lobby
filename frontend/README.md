# QC Lobby Frontend

Frontend application for the QC Lobby Video Quality Control SaaS platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Job Creation**: Create new QC jobs with video URL, duration, and QC mode
- **Job List**: View all jobs with real-time status updates
- **Auto Polling**: Automatically polls active jobs every 3 seconds
- **QC Results**: Display QC results when jobs are completed
- **Error Handling**: Comprehensive error handling for all states

## API Integration

The frontend connects to the FastAPI backend at `/v1/jobs`:
- `GET /v1/jobs` - List all jobs
- `GET /v1/jobs/{job_id}` - Get single job (for polling)
- `POST /v1/jobs` - Create new job

## Authentication

Uses Supabase authentication. Users must sign in before accessing the application.
