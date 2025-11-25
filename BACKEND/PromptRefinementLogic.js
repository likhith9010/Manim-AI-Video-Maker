require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are an expert prompt engineer specializing in educational video content creation. Your task is to refine and enhance user prompts to create comprehensive, detailed prompts that will be used to generate high-quality educational video scripts.

When refining a prompt, you should:
1. Expand on the topic to make it more comprehensive
2. Add specific details about what should be covered
3. Suggest visual elements that would enhance understanding
4. Ensure the prompt is clear and actionable for script generation
5. Maintain the original intent while making it more detailed

Return only the refined prompt without any additional commentary or explanation do this in under 250 words.`;

async function refinePrompt(userPrompt) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // --- FIX ---
    // Using the same modern, non-experimental model as your other files.
    // This will fix the 429 quota error.
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', 
      systemInstruction: SYSTEM_PROMPT 
    });
    
    // We can still "prime" the model to give the response we want
    const promptForModel = `User Prompt: ${userPrompt}\n\nRefined Prompt:`;

    const result = await model.generateContent(promptForModel);
    const response = await result.response;

    // Safety/Error Check
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
      const finishReason = response.candidates?.[0]?.finishReason || 'UNKNOWN';
      console.error(`Gemini API returned no content. Finish Reason: ${finishReason}`);
      throw new Error(`Failed to generate prompt. The model response was empty or blocked (Reason: ${finishReason}).`);
    }

    const refinedPrompt = response.text().trim();
    return refinedPrompt;

  } catch (error) {
    console.error('Error in PromptRefinementLogic:', error.message); 
    if (error.details) {
      console.error('Error details:', error.details);
    }
    throw error; // Re-throw the error to be caught by server.js
  }
}

module.exports = {
  refinePrompt
};