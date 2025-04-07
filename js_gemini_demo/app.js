// Import necessary modules
import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import * as fs from 'fs';

// URL and local filename for the text file to be downloaded
const fileUrl = 'https://storage.googleapis.com/generativeai-downloads/data/a11.txt';
const textFileName = 'a11.txt';

async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  const writer = fs.createWriteStream(outputPath);
  response.body.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function analyzeTextFile() {
  // Initialize the Gemini client
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable not set");
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const MODEL_ID = "gemini-1.5-flash";

  try {
    // Download the file
    console.log("Downloading file...");
    await downloadFile(fileUrl, textFileName);
    console.log("File downloaded successfully");

    // Read the file content
    const fileContent = fs.readFileSync(textFileName, 'utf-8');

    const prompt = "Find four lighthearted moments in this text file.";
    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    // Generate content
    const result = await model.generateContent([prompt, fileContent]);
    const response = await result.response;
    const text = response.text();
    console.log(text);

    // Clean up - delete the downloaded file
    fs.unlinkSync(textFileName);
    console.log("Temporary file deleted");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the analysis
analyzeTextFile().catch(console.error);