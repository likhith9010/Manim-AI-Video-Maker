require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// This is the "few-shot" system prompt you described.
// It's critical for getting a consistently formatted script.
const SCRIPT_SYSTEM_PROMPT = `You are an AI video scriptwriter. Your task is to take a detailed user prompt and write a full production script (visuals and speech) for a video that is UNDER 2 MINUTES.
You MUST follow the format of the examples below exactly.

--- EXAMPLE START ---
User prompt = "Develop a comprehensive video script explaining the Binomial Theorem. Begin by defining the theorem and its purpose. Detail Pascal's Triangle and its relationship to the coefficients. Provide a step-by-step breakdown for n=2 and n=3. Include the binomial coefficient formula."

--scene1--
Title: What is the Binomial Theorem?
Visuals = "Clean animation of (x+y)^n appearing on screen. The 'n' clicks from 2, to 3, to 10. The expansion for n=10 becomes huge and complex."
--speech--
0:05 Hello and welcome! Today we're exploring a powerful tool in algebra: the Binomial Theorem.
0:10 Ever wondered how to expand an expression like (x + y) to the power of 10 without doing endless multiplication?
0:17 That's exactly what this theorem is for. It gives us a fast, elegant formula for this exact problem.

--scene2--
Title: The Formula & Pascal's Triangle
Visuals = "The binomial coefficient formula (n choose k) appears. Next to it, an animated Pascal's Triangle builds itself, row by row. Highlight n=3 row [1, 3, 3, 1]."
--speech--
0:25 The theorem uses something called 'binomial coefficients', which you might know from Pascal's Triangle.
0:32 For example, to expand (x+y) to the power of 3, we look at the row [1, 3, 3, 1].
0:40 These numbers are the 'coefficients', or multipliers, for each term in our expanded expression.
--- EXAMPLE  END ---

You will now be given a new user prompt. Generate the script in the exact same format. DO NOT add any extra commentary and give manim compatable visuals.

The script must be clear, easy to follow, and strictly under 2 minutes.`;

/**
 * Generates a video script from a refined prompt.
 * @param {string} refinedPrompt The detailed prompt for the video.
 * @returns {Promise<string>} The generated script text.
 */
async function generateScript(refinedPrompt) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // Using the model that works for you
      systemInstruction: SCRIPT_SYSTEM_PROMPT,
    });

    const result = await model.generateContent(refinedPrompt);
    const response = await result.response;

    // Safety/Error Check
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
      const finishReason = response.candidates?.[0]?.finishReason || 'UNKNOWN';
      console.error(`Gemini API returned no script content. Finish Reason: ${finishReason}`);
      throw new Error(`Failed to generate script. The model response was empty or blocked (Reason: ${finishReason}).`);
    }

    const scriptText = response.text().trim();
    return scriptText;

  } catch (error) {
    console.error('Error in scriptLogic.js:', error.message);
    if (error.details) {
      console.error('Error details:', error.details);
    }
    throw error; // Re-throw the error to be caught by server.js
  }
}

module.exports = {
  generateScript
};