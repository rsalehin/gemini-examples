import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Helper function to download images
async function downloadImage(url, filename) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(filename, Buffer.from(buffer));
  console.log(`Downloaded ${filename}`);
}

// Convert local image to generative part
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

async function analyzeShapes() {
  // Initialize the Gemini client
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable not set");
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const MODEL_ID = "gemini-1.5-flash";

  try {
    // Download the images
    await Promise.all([
      downloadImage("https://storage.googleapis.com/generativeai-downloads/images/triangle.png", "triangle.png"),
      downloadImage("https://storage.googleapis.com/generativeai-downloads/images/square.png", "square.png"),
      downloadImage("https://storage.googleapis.com/generativeai-downloads/images/pentagon.png", "pentagon.png")
    ]);

    const prompt = `Look at this sequence of three shapes. What shape should come as the fourth shape? Explain
    your reasoning with detailed descriptions of the first shapes.`;

    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    // Prepare image parts
    const imageParts = [
      fileToGenerativePart("triangle.png", "image/png"),
      fileToGenerativePart("square.png", "image/png"),
      fileToGenerativePart("pentagon.png", "image/png")
    ];

    // Generate content
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    console.log(text);

    // Clean up downloaded files
    ["triangle.png", "square.png", "pentagon.png"].forEach(file => {
      fs.unlinkSync(file);
      console.log(`Deleted ${file}`);
    });

  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the analysis
analyzeShapes().catch(console.error);