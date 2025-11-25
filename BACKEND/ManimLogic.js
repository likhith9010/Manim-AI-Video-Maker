require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { exec } = require('child_process');
const { uploadFile } = require('./storage');

// Promisify
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const execAsync = util.promisify(exec);

// Use the new, separate API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_MANIM || '');

// Allow overriding executable paths (useful on Windows/venv)
const MANIM_CMD = process.env.MANIM_CMD || 'manim';
const FFMPEG_CMD = process.env.FFMPEG_CMD || 'ffmpeg';

// Helper: build the manim executable portion safely
function buildManimExec(cmd) {
  // If user sets cmd like "python -m manim", don't wrap in quotes
  if (/^python\s+-m\s+manim(\s|$)/i.test(cmd)) return cmd;
  // Otherwise, quote the path in case it has spaces
  return `"${cmd}"`;
}

// --- 1. NEW PROMPT: Asks for Python code ---
const MANIM_CODE_PROMPT = `You are an expert Manim developer. Your task is to write a *complete, single* Python script that generates an animation based on the user's script.

CRITICAL RULES - BREAKING THESE WILL CAUSE RENDERING FAILURE:

1.  The script MUST import all necessary Manim components (e.g., \`from manim import *\`).
2.  The script MUST define a single scene class named \`ManimScene\`.
3.  The class MUST have a \`construct(self)\` method.
4.  All animations must happen inside \`construct(self)\`.
5.  Use \`self.play(...)\` for animations and \`self.wait(...)\` for pauses.

6.  WHITELIST - Use ONLY these approved elements:
  - **Text**: \`Text(...)\` for ALL text, titles, labels, formulas (use Unicode: ∫, Σ, ≤, ≥, θ, π, √, ×, ÷)
  - **Shapes**: \`Circle()\`, \`Square()\`, \`Rectangle()\`, \`Line()\`, \`Dot()\` ONLY
  - **Grouping**: \`VGroup(...)\`
  - **Colors**: \`BLUE\`, \`RED\`, \`GREEN\`, \`YELLOW\`, \`PURPLE\`, \`ORANGE\`, \`PINK\`, \`WHITE\`, \`BLACK\`, \`GREY\` (and their variants like BLUE_A, RED_B, etc.)
  - **Animations**: \`Write()\`, \`FadeIn()\`, \`FadeOut()\`, \`Create()\`, \`Transform()\`, \`ReplacementTransform()\`, \`Uncreate()\`, \`GrowFromCenter()\`, \`ShrinkToCenter()\`
  - **Positioning**: \`.to_edge()\`, \`.shift()\`, \`.next_to()\`, \`.move_to()\`, \`.set_color()\`, \`.scale()\`, \`.rotate()\`, \`.align_to()\`
  - **Get methods**: \`.get_center()\`, \`.get_top()\`, \`.get_bottom()\`, \`.get_left()\`, \`.get_right()\`

7.  BLACKLIST - NEVER use these (will be auto-removed):
  - ❌ LaTeX: \`Tex\`, \`MathTex\`, \`TexTemplate\`
  - ❌ Graphing: \`Axes\`, \`NumberLine\`, \`NumberPlane\`, \`get_graph\`, \`plot\`
  - ❌ Arrows: \`Arrow\`, \`DoubleArrow\`, \`CurvedArrow\`, \`Vector\`
  - ❌ Complex shapes: \`Polygon\`, \`Triangle\`, \`Ellipse\`, \`Arc\`
  - ❌ Advanced animations: \`Flash\`, \`Indicate\`, \`ApplyMethod\`, \`ShowCreation\`
  - ❌ Dict unpacking: \`**config\`, \`**kwargs\`
  - ❌ Hallucinated methods: \`wait_until()\`, \`pause()\`

8.  Do NOT add any comments or explanations outside the Python code. Only return raw Python.
9.  Base your animation on the "Visuals" and "Speech" cues. Use creative combinations of approved elements only.

Here is the user's script. Create a Manim scene that visualizes it using ONLY whitelisted elements:
---
[USER SCRIPT]
`;

/**
 * Generates Manim code, renders it, and stitches it with audio.
 * @param {string} script - The user's full script (for the AI).
 * @param {string} localAudioPath - The file system path to the .wav file.
 * @returns {Promise<{videoUrl: string}>}
 */
async function generateVideo(script, localAudioPath) {
  // --- 2. FILE NAME CHANGE ---
  // We use the 'jobId' for the .py file, not 'jobId_instructions.json'
  const jobId = Date.now();
  console.log(`[ManimLogic] Starting job: ${jobId}`);

  // --- 1. Setup Paths ---
  const codesDir = path.join(__dirname, 'media', 'codes');
  const videosDir = path.join(__dirname, 'media', 'videos');
  await mkdir(codesDir, { recursive: true });
  await mkdir(videosDir, { recursive: true });

  // --- 2. FILE NAME CHANGE ---
  // We now save a .py file instead of a .json file
  const pyFilePath = path.join(codesDir, `scene_${jobId}.py`);
  
  const silentVideoName = `silent_${jobId}.mp4`;
  const silentVideoPath = path.join(videosDir, silentVideoName);
  
  const finalVideoName = `final_${jobId}.mp4`;
  const finalVideoPath = path.join(videosDir, finalVideoName);

  try {
    // --- 3. Call AI to get Manim Code ---
    console.log(`[ManimLogic] Calling AI for Manim code...`);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const fullPrompt = MANIM_CODE_PROMPT.replace('[USER SCRIPT]', script);
    
    const result = await model.generateContent(fullPrompt);
    let pythonCode = result.response.text();

    // Clean up the AI's response (remove markdown fences)
    pythonCode = pythonCode.replace(/^```python\n/, '').replace(/```$/, '').trim();

    // --- 3a. Sanitize to remove any LaTeX usage and numbered ticks ---
    pythonCode = sanitizeNoLatex(pythonCode);
    
    await writeFile(pyFilePath, pythonCode);
    console.log(`[ManimLogic] Saved Manim code to ${pyFilePath}`);

    // --- 4. Run Manim ---
    // This command now executes the .py file we just saved
  const manimCommand = `${buildManimExec(MANIM_CMD)} -qm -o ${silentVideoName} "${pyFilePath}" ManimScene`;
    console.log(`[ManimLogic] Executing Manim: ${manimCommand}`);
    
    // This is the step that requires Manim to be installed on your server's PATH!
    await execAsync(manimCommand, { cwd: videosDir });

    // Find the actual output file path (Manim nests under media/videos/<Scene>/<res>/)
    const resolvedSilentPath = await findFileRecursive(videosDir, silentVideoName);
    if (!resolvedSilentPath) {
      throw new Error(`Silent video not found after Manim render: expected '${silentVideoName}' under '${videosDir}'.`);
    }
    console.log(`[ManimLogic] Silent video created at: ${resolvedSilentPath}`);

    // --- 5. Run FFMPEG to Stitch ---
    const ffmpegCommand = `"${FFMPEG_CMD}" -i "${resolvedSilentPath}" -i "${localAudioPath}" -c:v copy -c:a aac -shortest "${finalVideoPath}"`;
    console.log(`[ManimLogic] Executing FFMPEG: ${ffmpegCommand}`);
    
    await execAsync(ffmpegCommand);
    console.log(`[ManimLogic] Final video created: ${finalVideoPath}`);

    // --- 6. Upload to Google Cloud Storage ---
    const gcsDestination = `videos/${finalVideoName}`;
    const { publicUrl } = await uploadFile(finalVideoPath, gcsDestination, true);
    
    console.log(`[ManimLogic] Video uploaded to GCS: ${publicUrl}`);

    // --- 7. Return GCS URL ---
    return { 
      videoUrl: publicUrl, 
      pythonCodePath: pyFilePath 
    };

  } catch (err) {
    console.error(`[ManimLogic] Error on job ${jobId}:`, err);
    // Log the full error, including std_out and std_err from Manim/FFMPEG
    console.error('STDOUT:', err.stdout);
    console.error('STDERR:', err.stderr);
    throw new Error(`Video generation failed: ${err.stderr || err.message}`);
  }
}

module.exports = {
  generateVideo
};

// --- Helpers ---
function sanitizeNoLatex(code) {
  let out = code;
  
  // === WHITELIST ENFORCEMENT ===
  // Define allowed Manim primitives (shapes, text, basic animations, positioning)
  const ALLOWED_SHAPES = ['Circle', 'Square', 'Rectangle', 'Line', 'Dot', 'VGroup'];
  const ALLOWED_TEXT = ['Text'];
  const ALLOWED_ANIMATIONS = ['Write', 'FadeIn', 'FadeOut', 'Create', 'Transform', 'ReplacementTransform', 'Uncreate', 'GrowFromCenter', 'ShrinkToCenter'];
  const ALLOWED_METHODS = ['to_edge', 'shift', 'next_to', 'move_to', 'set_color', 'scale', 'rotate', 'align_to', 'get_center', 'get_top', 'get_bottom', 'get_left', 'get_right'];
  const ALLOWED_COLORS = ['BLUE', 'RED', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'PINK', 'WHITE', 'BLACK', 'GREY', 'GRAY', 
                          'BLUE_A', 'BLUE_B', 'BLUE_C', 'BLUE_D', 'BLUE_E',
                          'RED_A', 'RED_B', 'RED_C', 'RED_D', 'RED_E',
                          'GREEN_A', 'GREEN_B', 'GREEN_C', 'GREEN_D', 'GREEN_E',
                          'YELLOW_A', 'YELLOW_B', 'YELLOW_C', 'YELLOW_D', 'YELLOW_E',
                          'GREY_A', 'GREY_B', 'GREY_C', 'GREY_D', 'GREY_E',
                          'DARK_GREY', 'LIGHT_GREY', 'DARK_GRAY', 'LIGHT_GRAY'];
  
  // FORBIDDEN elements that must be stripped
  const FORBIDDEN_ELEMENTS = [
    // LaTeX
    'MathTex', 'Tex', 'TexTemplate',
    // Graphing/Axes
    'Axes', 'NumberLine', 'NumberPlane', 'get_graph', 'plot', 'get_axis_labels',
    // Advanced/Unreliable animations
    'Flash', 'Indicate', 'ApplyMethod', 'ShowCreation', 'DrawBorderThenFill',
    // Arrows (often problematic)
    'Arrow', 'DoubleArrow', 'CurvedArrow', 'Vector',
    // 3D elements
    'ThreeDScene', 'ThreeDAxes', 'Surface', 'ParametricSurface',
    // Complex shapes that fail often
    'Polygon', 'RegularPolygon', 'Triangle', 'Ellipse', 'Arc', 'ArcBetweenPoints', 'CurvedDoubleArrow',
    // Rate functions that might not exist
    'linear', 'smooth', 'rush_into', 'rush_from'
  ];

  // Step 1: Strip all forbidden elements by replacing them with safe alternatives
  FORBIDDEN_ELEMENTS.forEach(forbidden => {
    // Replace class instantiation: ForbiddenClass(...) -> Text("...")
    const classRegex = new RegExp(`\\b${forbidden}\\s*\\([^)]*\\)`, 'g');
    out = out.replace(classRegex, 'Text("Element removed")');
    
    // Replace method calls: .forbidden_method(...) -> # removed
    const methodRegex = new RegExp(`\\.${forbidden}\\s*\\([^)]*\\)`, 'g');
    out = out.replace(methodRegex, '');
  });

  // Step 2: Legacy sanitization (keep for backward compatibility)
  out = out.replace(/\bMathTex\s*\(/g, 'Text(');
  out = out.replace(/\bTex\s*\(/g, 'Text(');

  // Step 3: Remove dict unpacking (causes duplicate kwargs)
  out = out.replace(/\*\*[a-zA-Z_][a-zA-Z0-9_]*\s*,?\s*/g, '');

  // Step 4: Fix hallucinated methods
  out = out.replace(/self\.wait_until\s*\([^)]*\)/g, 'self.wait(1)');
  out = out.replace(/self\.pause\s*\([^)]*\)/g, 'self.wait(1)');

  // Step 5: Clean up any empty play() calls or broken lines
  out = out.replace(/self\.play\(\s*\)/g, 'self.wait(0.5)');
  out = out.replace(/^\s*,\s*$/gm, ''); // Remove lines with just commas
  out = out.replace(/,\s*,/g, ','); // Remove double commas

  return out;
}

async function findFileRecursive(startDir, targetName) {
  const dirs = [startDir];
  while (dirs.length) {
    const dir = dirs.pop();
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (e) {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        dirs.push(full);
      } else if (entry.isFile() && entry.name === targetName) {
        return full;
      }
    }
  }
  return null;
}