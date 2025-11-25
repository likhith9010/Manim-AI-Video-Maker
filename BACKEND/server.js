require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// --- Database ---
const connectDB = require('./db');
const Session = require('./models/Session');

// --- 1. Import ALL logic files ---
const PromptRefinementLogic = require('./PromptRefinementLogic');
const ScriptLogic = require('./ScriptLogic');
const TTSLogic = require('./TTSLogic');
const ManimLogic = require('./ManimLogic'); // <-- The Manim pipeline logic

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Configure CORS to allow both localhost (dev) and production domains
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    // Add your Vercel domain after deployment:
    // 'https://your-app-name.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Make the 'media' folder public ---
app.use('/media', express.static(path.join(__dirname, 'media')));

// --- 2. Ensure ALL media directories exist on startup ---
const mediaDir = path.join(__dirname, 'media');
const audioDir = path.join(mediaDir, 'audio');
const codesDir = path.join(mediaDir, 'codes');
const videosDir = path.join(mediaDir, 'videos');

[audioDir, codesDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});


// --- "Fast AI" Endpoint 1: Refine Prompt ---
app.post('/api/improve-prompt', async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!sessionId) return res.status(400).json({ error: 'SessionId is required' });
    
    const refinedPrompt = await PromptRefinementLogic.refinePrompt(prompt);
    
    // Save/update session in database
    await Session.findOneAndUpdate(
      { sessionId },
      { 
        sessionId,
        prompt,
        refinedPrompt,
        status: 'refining'
      },
      { upsert: true, new: true }
    );
    
    res.json({ refinedPrompt, sessionId });
  } catch (error) {
    console.error('Error refining prompt:', error);
    res.status(500).json({ error: 'Failed to refine prompt', details: error.message });
  }
});

// --- "Fast AI" Endpoint 2: Generate Script ---
app.post('/api/generate-script', async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'A prompt is required' });
    if (!sessionId) return res.status(400).json({ error: 'SessionId is required' });
    
    const script = await ScriptLogic.generateScript(prompt);
    
    // Update session with script
    await Session.findOneAndUpdate(
      { sessionId },
      { 
        script,
        status: 'script_generating'
      },
      { upsert: true, new: true }
    );
    
    res.json({ script, sessionId });
  } catch (error) {
    console.error('Error generating script:', error);
    res.status(500).json({ error: 'Failed to generate script', details: error.message });
  }
});

// --- 3. STAGE 1 (FAST): Generate Audio ---
// This endpoint *only* synthesizes audio and returns the streaming URL.
app.post('/api/generate-audio', async (req, res) => {
  try {
    const { script, sessionId } = req.body;
    if (!script) return res.status(400).json({ error: 'A script is required' });
    if (!sessionId) return res.status(400).json({ error: 'SessionId is required' });

    console.log('Calling TTSLogic.generateAudio...');
    // Returns the web URL and the local path (for the next step)
    const { audioUrl, localAudioPath } = await TTSLogic.generateAudio(script);
    
    // Update session with audio file path
    await Session.findOneAndUpdate(
      { sessionId },
      { audioFilePath: localAudioPath },
      { new: true }
    );
    
    // FAST RESPONSE: Frontend receives this immediately to start streaming
    res.json({ audioUrl, localAudioPath, sessionId }); 

  } catch (error) {
    console.error('Error generating audio:', error);
    
    // Update session with error
    if (req.body.sessionId) {
      await Session.findOneAndUpdate(
        { sessionId: req.body.sessionId },
        { status: 'failed', errorMessage: error.message }
      );
    }
    
    res.status(500).json({ error: 'Failed to generate audio', details: error.message });
  }
});

// --- 4. STAGE 2 (SLOW): Generate Video ---
// This endpoint handles the long-running Manim/FFMPEG process.
app.post('/api/generate-video', async (req, res) => {
  try {
    console.log('Received request for STAGE 2: Video Generation');
    const { script, localAudioPath, sessionId } = req.body;
    
    if (!script || !localAudioPath) {
      return res.status(400).json({ error: 'Script and localAudioPath are required' });
    }
    if (!sessionId) {
      return res.status(400).json({ error: 'SessionId is required' });
    }

    // Update session status
    await Session.findOneAndUpdate(
      { sessionId },
      { status: 'video_generating' }
    );

    console.log('Calling ManimLogic.generateVideo...');
    // This is the slow Manim/FFMPEG step
    const { videoUrl, pythonCodePath } = await ManimLogic.generateVideo(script, localAudioPath);
    console.log('Video generated successfully.');
    
    // Update session with video file path and completion status
    await Session.findOneAndUpdate(
      { sessionId },
      { 
        videoFilePath: videoUrl,
        pythonCodePath: pythonCodePath || '',
        status: 'completed'
      },
      { new: true }
    );
    
    // SLOW RESPONSE: Frontend receives this when the video is complete
    res.json({ videoUrl, sessionId }); 

  } catch (error) {
    console.error('Error generating video (Stage 2):', error);
    console.error('Error stack:', error.stack);
    
    // Update session with error
    if (req.body.sessionId) {
      await Session.findOneAndUpdate(
        { sessionId: req.body.sessionId },
        { status: 'failed', errorMessage: error.message }
      );
    }
    
    res.status(500).json({ error: 'Failed to generate video', details: error.message });
  }
});


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Initialize database connection
connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});