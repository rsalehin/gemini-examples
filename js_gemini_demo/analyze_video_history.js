import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import { GoogleGenerativeAI } from '@google/generative-ai';

const pipelineAsync = promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  throw new Error("❌ GOOGLE_API_KEY is not set in environment.");
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const MODEL_ID = "gemini-1.5-flash";

const videoUrl = "https://s3.amazonaws.com/NARAprodstorage/opastorage/live/16/147/6014716/content/presidential-libraries/reagan/5730544/6-12-1987-439.mp4";
const localVideoPath = path.join(__dirname, "berlin.mp4");

const systemPrompt = `
You are a historian who specializes in events caught on film.
When you receive a video, answer the following:
1. When did it happen?
2. Who is the most important person in the video?
3. What is the name of the event?
`;

const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

function log(msg) {
  console.log(`${chalk.gray(new Date().toLocaleTimeString())} ${msg}`);
}

async function downloadVideo(url, filepath) {
  log(chalk.blue("Downloading video..."));
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream'
  });

  const totalLength = response.headers['content-length'];
  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progress.start(Number(totalLength), 0);

  let downloaded = 0;
  response.data.on('data', chunk => {
    downloaded += chunk.length;
    progress.update(downloaded);
  });

  await pipelineAsync(response.data, fs.createWriteStream(filepath));
  progress.stop();
  log(chalk.green(`Download complete: ${filepath}`));
}

async function loadVideoFile(filePath) {
  const stats = await fsPromises.stat(filePath);
  if (stats.size > 20 * 1024 * 1024) {
    throw new Error("Video file is too large for Gemini API. Use a shorter clip (<20MB).");
  }
  const buffer = await fsPromises.readFile(filePath);
  return buffer;
}

async function analyzeVideo() {
  try {
    await downloadVideo(videoUrl, localVideoPath);
    const buffer = await loadVideoFile(localVideoPath);

    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction: systemPrompt,
      safetySettings,
    });

    log(chalk.yellow("Sending video for analysis..."));
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: "Analyze this historical video clip and answer the questions." },
          {
            inlineData: {
              mimeType: "video/mp4",
              data: buffer.toString('base64')
            }
          }
        ]
      }]
    });

    const response = await result.response;
    log(chalk.green("\n📽️ Historical Video Analysis:\n"));
    console.log(response.text());

  } catch (error) {
    log(chalk.red(`Error: ${error.message}`));
    if (error.message.includes("too large")) {
      console.log(chalk.cyan("\nSuggestions:"));
      console.log("1. Use a shorter video clip (<20MB)");
      console.log("2. Extract key frames and analyze them as images");
      console.log("3. Upload to a cloud storage and use the link instead (if supported)");
    }
  } finally {
    if (fs.existsSync(localVideoPath)) {
      await fsPromises.unlink(localVideoPath);
      log(chalk.gray("Cleaned up temporary video file."));
    }
  }
}

analyzeVideo();
