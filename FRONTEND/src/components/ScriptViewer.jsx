import React from 'react';

// A simple loading spinner
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// A larger spinner for the content box
const ContentSpinner = () => (
  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


function ScriptViewer({ script, setScript, onGenerateVideo, appStatus }) {
  
  const isScriptLoading = appStatus === 'SCRIPT_GENERATING';
  const isVideoLoading = appStatus === 'VIDEO_GENERATING';
  
  // Button is disabled if any major process is running
  const isButtonDisabled = (appStatus !== 'IDLE' && appStatus !== 'ERROR') || !script;

  const renderContent = () => {
    if (isScriptLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center">
          <ContentSpinner />
          <span className="mt-2 font-semibold text-blue-700">Generating Script...</span>
        </div>
      );
    }
    
    // --- FIX: Show textarea if script exists ---
    if (script) {
      return (
        <textarea
          className="flex-1 w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm resize-none focus:ring-blue-500 focus:border-blue-500"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          // Only allow editing when the app is idle
          disabled={isVideoLoading || isScriptLoading} 
        />
      );
    }
    
    // Show placeholder otherwise
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <p className="text-gray-500 text-center">[Script will appear here]</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-[500px] flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-center">Script</h2>
      
      {renderContent()}

      {/* Button to Generate Video (Audio + Video combined) */}
      {script && !isScriptLoading && (appStatus === 'IDLE' || appStatus === 'ERROR') && (
        <button
          onClick={onGenerateVideo}
          disabled={isButtonDisabled}
          className={`flex justify-center items-center font-medium rounded-lg text-sm px-5 py-2.5 text-center w-full transition-all text-white mt-4 ${
            (isButtonDisabled) 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-800'
          }`}
        >
          {isVideoLoading ? (
            <> <Spinner /> Generating Video... </>
          ) : (
            "Generate Video"
          )}
        </button>
      )}
    </div>
  );
}

export default ScriptViewer;