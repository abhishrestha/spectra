# Vercel Deployment Guide

## Prerequisites
- Vercel CLI installed: `npm install -g vercel`
- Vercel account linked: `vercel login`

## Environment Variables
Set these in Vercel project settings or via CLI:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
```

## Deployment Steps

### 1) Deploy from the server directory
```
cd server
vercel
```

### 2) Add environment variables if not already set
```
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
vercel env add TAVILY_API_KEY
```

### 3) Promote to production
```
vercel --prod
```

## Post-Deployment
- **Update frontend API URL:** Point the client to the deployed backend URL in `client/src/lib/api.ts` (use production URL when `NODE_ENV === 'production'`).
- **CORS origins:** If the frontend runs on a different domain, add it to the `allow_origins` list in `server/app.py`.
- **Health check:**
```
curl https://your-backend.vercel.app/health
```

## Local Testing with Vercel
```
cd server
vercel dev
```

## Troubleshooting
- **Build fails on requirements:** ensure `requirements.txt` has only PyPI URLs (no local file:// entries).
- **Cold starts:** first request may take a few seconds; consider a cron to keep warm.
- **Logs:** `vercel logs <deployment-url>`

## Configuration Files
- `vercel.json` — Vercel deployment config
- `requirements.txt` — Python dependencies
- `app.py` — FastAPI app exporting `handler` for Vercel
