import React from 'react';

// A larger spinner for the content box
const ContentSpinner = () => (
  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Accept props from App.jsx
function VideoViewer({ videoUrl, appStatus }) {
  
  const isLoading = appStatus === 'VIDEO_GENERATING';
  const isVideoReady = appStatus === 'AUDIO_READY' || appStatus === 'AUDIO_GENERATING';

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full">
          <ContentSpinner />
          <span className="mt-2 font-semibold text-blue-700">Manim rendering and stitching video... (this will take time)</span>
        </div>
      );
    }

    if (videoUrl) {
      return (
        <video controls autoPlay className="w-full h-full rounded-lg" src={videoUrl}>
          Your browser does not support the video tag.
        </video>
      );
    }

    // Default placeholder
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-gray-200 rounded-lg">
        <p className="text-gray-500">[Video preview will appear here]</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 h-[600px] flex flex-col">
      <h2 className="text-xl font-bold mb-2 text-center text-gray-700">Video Preview</h2>
      <div className="flex-1 w-full h-full">
        {renderContent()}
      </div>
    </div>
  );
}

export default VideoViewer;