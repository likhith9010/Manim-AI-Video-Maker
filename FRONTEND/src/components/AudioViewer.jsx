import React from 'react';

// A larger spinner for the content box
const ContentSpinner = () => (
  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

function AudioViewer({ audioUrl, appStatus, onGenerateVideo }) {
  
  const isAudioLoading = appStatus === 'AUDIO_GENERATING';
  const isVideoLoading = appStatus === 'VIDEO_GENERATING'; 
  const isAudioReady = appStatus === 'AUDIO_READY';

  const renderContent = () => {
    if (isAudioLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full">
          <ContentSpinner />
          <span className="mt-2 font-semibold text-blue-700">Generating Audio...</span>
        </div>
      );
    }

    if (audioUrl) {
      // Show the audio player
      return (
        // Changed items-center to items-start for better layout consistency 
        <div className="flex-1 flex flex-col items-start justify-center h-full p-2"> 
          <audio controls autoPlay className="w-full" src={audioUrl}> 
            Your browser does not support the audio element.
          </audio>
          {/* --- STAGE 2 BUTTON ---
              Keep visible whenever audio exists and we're not generating audio,
              so users can retry video after errors. */}
          {(!isAudioLoading) && (
            <button
              onClick={onGenerateVideo} // <-- Calls Stage 2
              disabled={isVideoLoading}
              className={`bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded-lg w-full mt-1 transition-all ${
                isVideoLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isVideoLoading ? (
                <> <ContentSpinner /> Generating Video... </>
              ) : (
                "2. Generate Video"
              )}
            </button>
          )}
        </div>
      );
    }
    
    // Fallback: If for some reason video is loading but no audioUrl, show a spinner
    if (isVideoLoading && !audioUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full">
          <ContentSpinner />
          <span className="mt-2 font-semibold text-blue-700">Waiting 5s then generating video...</span>
        </div>
      );
    }
    
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-gray-400 text-sm">[Audio file will appear here]</p>
      </div>
    );
  };

  return (
    // Height remains h-32 (128px) or your custom height
    <div className="bg-white rounded-xl shadow-lg p-4 h-42 flex flex-col">
      <h2 className="text-xl font-bold mb-2 text-center text-gray-700">Audio</h2>
      {renderContent()}
    </div>
  );
}

export default AudioViewer;