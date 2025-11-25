import React, { useState } from 'react';
import PromptRefinement from './components/PromptRefinement';
import ScriptViewer from './components/ScriptViewer';
import VideoViewer from './components/VideoViewer';
import { v4 as uuidv4 } from 'uuid';

// Use environment variable for production, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'https://manim-backend-255677308139.us-central1.run.app';

// Helper function for the 5-second wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function App() {
  const [prompt, setPrompt] = useState('');
  const [script, setScript] = useState('');
  const [videoUrl, setVideoUrl] = useState(''); 
  const [sessionId, setSessionId] = useState(''); // Session ID for database tracking
  
  // Simplified statuses: IDLE, REFINING, SCRIPT_GENERATING, VIDEO_GENERATING, ERROR
  const [appStatus, setAppStatus] = useState('IDLE');
  
  const [errorMessage, setErrorMessage] = useState('');

  const resetState = () => {
    setAppStatus('IDLE');
    setErrorMessage('');
    setScript('');
    setVideoUrl('');
    setSessionId('');
  };

  const clearError = () => {
    setErrorMessage('');
    setAppStatus('IDLE');
  };

  // Generate a new session ID when starting any operation
  const getOrCreateSessionId = () => {
    if (sessionId) return sessionId;
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    return newSessionId;
  };

  // --- Fast AI: Refine Prompt (Omitted for brevity) ---
  const handleRefinePrompt = async () => {
    setAppStatus('REFINING');
    setErrorMessage('');
    const currentSessionId = getOrCreateSessionId();
    const minDelay = wait(1000); 
    const apiCall = fetch(`${API_URL}/api/improve-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sessionId: currentSessionId }),
    });
    try {
      const [apiResponse] = await Promise.all([apiCall, minDelay]);
      if (!apiResponse.ok) throw new Error((await apiResponse.json()).details);
      const data = await apiResponse.json();
      setPrompt(data.refinedPrompt);
      setAppStatus('IDLE');
    } catch (err) {
      setErrorMessage(err.message);
      setAppStatus('ERROR');
    }
  };

  // --- Fast AI: Generate Script (Omitted for brevity) ---
  const handleGenerateScript = async () => {
    setAppStatus('SCRIPT_GENERATING');
    setErrorMessage('');
    const currentSessionId = getOrCreateSessionId();
    const minDelay = wait(1000);
    const apiCall = fetch(`${API_URL}/api/generate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sessionId: currentSessionId }),
    });
    try {
      const [apiResponse] = await Promise.all([apiCall, minDelay]);
      if (!apiResponse.ok) throw new Error((await apiResponse.json()).details);
      const data = await apiResponse.json();
      setScript(data.script);
      setAppStatus('IDLE');
    } catch (err) {
      setErrorMessage(err.message);
      setAppStatus('ERROR');
    }
  };


  // --- Combined: Generate Audio + Video (chained automatically) ---
  const handleGenerateVideo = async () => {
    setAppStatus('VIDEO_GENERATING');
    setErrorMessage('');
    setVideoUrl(''); 
    const currentSessionId = getOrCreateSessionId();

    try {
      // Step 1: Generate audio (needed for FFmpeg stitching)
      const audioResponse = await fetch(`${API_URL}/api/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, sessionId: currentSessionId }),
      });
      
      if (!audioResponse.ok) {
        const error = await audioResponse.json();
        throw new Error(error.details || 'Audio generation failed');
      }
      
      const { localAudioPath } = await audioResponse.json();
      
      // Step 2: Wait 5 seconds before Manim
      await wait(5000);
      
      // Step 3: Generate video with audio stitched
      const videoResponse = await fetch(`${API_URL}/api/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, localAudioPath, sessionId: currentSessionId }),
      });
      
      if (!videoResponse.ok) {
        const error = await videoResponse.json();
        throw new Error(error.details || 'Video generation failed');
      }
      
      const { videoUrl } = await videoResponse.json();
      setVideoUrl(videoUrl);
      setAppStatus('IDLE');
      
    } catch (err) {
      setErrorMessage(err.message);
      setAppStatus('ERROR');
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-100">
      <header className="text-left p-4 text-3xl font-bold bg-sky-100 rounded-xl shadow-lg w-full block">
        Manim AI Video Maker
      </header>
      
      {errorMessage && (
        <div className="p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
            <div>
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{errorMessage}</span>
            </div>
            <button 
              onClick={clearError} 
              className="bg-red-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-red-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 p-4">
        
        <div className="w-full md:w-2/5">
          <PromptRefinement
            prompt={prompt}
            setPrompt={setPrompt}
            onRefine={handleRefinePrompt}
            onGenerateScript={handleGenerateScript}
            appStatus={appStatus}
          />
        </div>

        <div className="w-full md:w-3/5 flex flex-col gap-4">
          <VideoViewer 
            videoUrl={videoUrl}
            appStatus={appStatus}
          />
          <ScriptViewer
            script={script}
            setScript={setScript}
            onGenerateVideo={handleGenerateVideo}
            appStatus={appStatus}
          />
        </div>
      </div>
    </div>
  );
}

export default App;