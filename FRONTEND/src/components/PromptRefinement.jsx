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


function PromptRefinement({
  prompt,
  setPrompt,
  onRefine,
  onGenerateScript,
  appStatus
}) {

  const isLoading = appStatus !== 'IDLE' && appStatus !== 'ERROR';
  
  const isRefining = appStatus === 'REFINING';
  const isScriptGenerating = appStatus === 'SCRIPT_GENERATING';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Video Creation Guide</h2>
      
      <div className="relative flex-1 mb-4">
        <textarea
          className="w-full h-full p-4 border border-gray-300 rounded-lg resize-none"
          placeholder="✨ Enter your video topic here (e.g., 'Explain quadratic equations' or 'How does photosynthesis work?') 🎬"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
        />
        
        {isRefining && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-75 flex flex-col items-center justify-center rounded-lg">
            <ContentSpinner />
            <span className="mt-2 font-semibold text-blue-700">Refining prompt...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefine}
          disabled={!prompt || isLoading}
          className={`flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg ${
            (isLoading || !prompt) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isRefining ? (
            <>
              <Spinner />
              Refining...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/>
              </svg>
              Refine Prompt
            </>
          )}
        </button>

        <button
          onClick={onGenerateScript}
          disabled={!prompt || isLoading}
          className={`flex-1 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg ${
            (isLoading || !prompt) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isScriptGenerating ? (
            <>
              <Spinner />
              Generating Script...
            </>
          ) : (
            "Generate Script"
          )}
        </button>
      </div>
    </div>
  );
}

export default PromptRefinement;