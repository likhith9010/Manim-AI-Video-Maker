# Deployment Guide: Manim AI Video Maker

## Architecture Overview
- **Frontend**: Vercel (React + Vite)
- **Backend**: Google Cloud Run (Node.js + Python/Manim)
- **Storage**: Google Cloud Storage (2TB free)
- **Database**: MongoDB Atlas (512MB free)

---

## Prerequisites
✅ GCP project created: `manimvideomaker`
✅ GCS bucket created: `manim_ai_videomaker_backend`
✅ Service account with Storage Object Admin role
✅ MongoDB Atlas cluster configured
✅ Bucket permissions: `allUsers` has Storage Object Viewer role

---

## Part 1: Deploy Backend to Cloud Run

### Step 1: Install Google Cloud CLI
1. Download from: https://cloud.google.com/sdk/docs/install
2. Run: `gcloud init`
3. Login and select project `manimvideomaker`

### Step 2: Enable Required APIs
```powershell
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 3: Build and Deploy
```powershell
cd "C:\Users\likhi\My Projects\Manim_AI_Video_Maker\BACKEND"

# Build container image using Cloud Build
gcloud builds submit --tag gcr.io/manimvideomaker/manim-backend

# Deploy to Cloud Run
gcloud run deploy manim-backend `
  --image gcr.io/manimvideomaker/manim-backend `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --memory 2Gi `
  --cpu 2 `
  --timeout 600 `
  --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_API_KEY,MONGODB_URI=mongodb+srv://likhith9010_db_user:lJIIcjQ7Kmh3Oxhc@cluster0.zwxewje.mongodb.net/?appName=Cluster0,GCS_BUCKET=manim_ai_videomaker_backend" `
  --set-secrets "GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-key=gcp-service-account-key:latest"
```

**Important**: Replace `YOUR_GEMINI_API_KEY` with your actual Gemini API key.

### Step 4: Create Secret for Service Account Key
```powershell
# Create secret from your service account key file
gcloud secrets create gcp-service-account-key --data-file=".gcp\service-account-key.json"

# Grant Cloud Run service account access to the secret
gcloud secrets add-iam-policy-binding gcp-service-account-key `
  --member="serviceAccount:YOUR_CLOUD_RUN_SERVICE_ACCOUNT@manimvideomaker.iam.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"
```

### Step 5: Note Your Backend URL
After deployment, you'll get a URL like:
```
https://manim-backend-XXXXXXXX-uc.a.run.app
```
**Copy this URL** - you'll need it for frontend deployment.

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Install Vercel CLI
```powershell
npm install -g vercel
```

### Step 2: Update Frontend API URL
Open `FRONTEND/src/App.jsx` and update the API base URL:

```javascript
// Change from localhost to your Cloud Run URL
const API_BASE_URL = 'https://manim-backend-XXXXXXXX-uc.a.run.app';
```

### Step 3: Deploy to Vercel
```powershell
cd "C:\Users\likhi\My Projects\Manim_AI_Video_Maker\FRONTEND"

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel --prod
```

When prompted:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? `manim-ai-video-maker`
- Directory? `./` (current directory)
- Override settings? **N**

### Step 4: Note Your Frontend URL
Vercel will give you a URL like:
```
https://manim-ai-video-maker.vercel.app
```

---

## Part 3: Update CORS Settings

Update backend to allow your Vercel domain:

1. SSH to Cloud Run or edit locally and redeploy:

In `BACKEND/server.js`, update CORS:
```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://manim-ai-video-maker.vercel.app' // Add your Vercel URL
  ],
  credentials: true
};
```

2. Redeploy backend:
```powershell
cd BACKEND
gcloud builds submit --tag gcr.io/manimvideomaker/manim-backend
gcloud run deploy manim-backend --image gcr.io/manimvideomaker/manim-backend
```

---

## Part 4: Verify Deployment

1. Visit your Vercel URL: `https://manim-ai-video-maker.vercel.app`
2. Enter a prompt and generate a video
3. Verify:
   - ✅ Audio plays from GCS URL
   - ✅ Video plays from GCS URL
   - ✅ Session saved in MongoDB Atlas

---

## Cost Monitoring (All Free Tier)

### Google Cloud Run
- **Free tier**: 2 million requests/month
- **Memory**: 2Gi (within free tier)
- **CPU**: 2 vCPU (within free tier)
- **Estimate**: $0/month for moderate usage

### Google Cloud Storage
- **Free**: 2TB from Gemini subscription
- **Public bandwidth**: First 1GB/month free, then ~$0.12/GB
- **Estimate**: $0-10/month depending on video views

### MongoDB Atlas
- **Free tier**: 512MB storage, shared cluster
- **Estimate**: $0/month

### Vercel
- **Free tier**: 100GB bandwidth/month
- **Estimate**: $0/month

**Total estimated cost**: $0-10/month

---

## Troubleshooting

### Backend won't start on Cloud Run
- Check logs: `gcloud run services logs read manim-backend --region us-central1`
- Verify environment variables are set
- Check service account permissions

### Files not uploading to GCS
- Verify service account has Storage Object Admin role
- Check bucket has `allUsers` with Storage Object Viewer role
- Verify GOOGLE_APPLICATION_CREDENTIALS secret is mounted

### CORS errors
- Ensure Vercel URL is in CORS allowlist
- Redeploy backend after CORS changes

### MongoDB connection fails
- Verify MongoDB Atlas allows connections from all IPs (0.0.0.0/0)
- Check MONGODB_URI environment variable

---

## Updating Your Deployment

### Update Backend
```powershell
cd BACKEND
gcloud builds submit --tag gcr.io/manimvideomaker/manim-backend
gcloud run deploy manim-backend --image gcr.io/manimvideomaker/manim-backend
```

### Update Frontend
```powershell
cd FRONTEND
vercel --prod
```

---

## Environment Variables Reference

### Backend (Cloud Run)
- `GEMINI_API_KEY`: Your Google Gemini API key
- `MONGODB_URI`: MongoDB Atlas connection string
- `GCS_BUCKET`: manim_ai_videomaker_backend
- `GOOGLE_APPLICATION_CREDENTIALS`: /secrets/gcp-key (from secret)
- `PORT`: Auto-set by Cloud Run

### Frontend (Vercel)
- `VITE_API_URL`: Backend Cloud Run URL (optional, can hardcode in App.jsx)

---

## Next Steps
1. Set up custom domain (optional)
2. Configure CDN caching for GCS files
3. Add monitoring and alerts
4. Set up automated cleanup of old media files
