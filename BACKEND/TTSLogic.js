require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { uploadFile } = require('./storage');

// Promisify fs functions
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

// Initialize Gemini AI with the dedicated TTS key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_TTS || '');

// --- 1. PCM to WAV Conversion ---
function pcmToWav(pcmData, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length * (bitsPerSample / 8);
  const totalSize = 44 + dataSize; 

  const buffer = Buffer.alloc(totalSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < pcmData.length; i++) {
    buffer.writeInt16LE(pcmData[i], 44 + i * 2);
  }
  return buffer;
}

function base64ToArrayBuffer(base64String) {
  const binaryString = Buffer.from(base64String, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

// --- 2. Main Audio Generation Function ---
async function generateAudio(scriptText) {
  console.log('TTSLogic: Starting audio generation...');
  if (!process.env.GEMINI_API_KEY_TTS) {
    throw new Error('GEMINI_API_KEY_TTS is not set in environment variables');
  }

  const audioScript = scriptText;
  if (!audioScript) {
    throw new Error('No script text provided.');
  }
  console.log('TTSLogic: Sending full script to TTS API.');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });
  
  const payload = {
    contents: [{
      parts: [{ text: `Read the following script in a clear, informative, and friendly tone: ${audioScript}` }]
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    },
    model: 'gemini-2.5-flash-preview-tts'
  };

  console.log('TTSLogic: Calling Gemini TTS API...');
  
  const result = await model.generateContent(payload); 
  const response = result.response;

  const part = response?.candidates?.[0]?.content?.parts?.[0];
  const audioData = part?.inlineData?.data;
  const mimeType = part?.inlineData?.mimeType;

  if (!audioData || !mimeType || !mimeType.startsWith('audio/L16')) {
    console.error('TTSLogic Error: API did not return valid audio data.', response);
    throw new Error('Failed to generate audio. API response was invalid.');
  }

  const sampleRateMatch = mimeType.match(/rate=(\d+)/);
  const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
  
  console.log(`TTSLogic: Received audio data at ${sampleRate}Hz.`);

  const pcmData = base64ToArrayBuffer(audioData);
  const wavBuffer = pcmToWav(pcmData, sampleRate);

  // Save locally first (temporary)
  const mediaDir = path.join(__dirname, 'media', 'audio');
  await mkdir(mediaDir, { recursive: true });

  const fileName = `audio_${Date.now()}.wav`;
  const localFilePath = path.join(mediaDir, fileName);

  await writeFile(localFilePath, wavBuffer);
  console.log(`TTSLogic: Audio file saved locally to ${localFilePath}`);

  // Upload to Google Cloud Storage
  const gcsDestination = `audio/${fileName}`;
  const { publicUrl } = await uploadFile(localFilePath, gcsDestination, true);
  
  console.log(`TTSLogic: Audio uploaded to GCS: ${publicUrl}`);

  // Return GCS URL and local path (local path needed for FFmpeg)
  return {
    audioUrl: publicUrl,
    localAudioPath: localFilePath
  };
}

module.exports = {
  generateAudio
};