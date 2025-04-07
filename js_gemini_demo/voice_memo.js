import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const execAsync = promisify(exec);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.0-flash",
  systemInstruction: `
Objective: Transform raw thoughts and ideas into polished, engaging blog posts that capture a writer's unique style and voice.

Input:
Example Blog Posts (1-5): A user will provide examples of blog posts that resonate with their desired style and tone.
Audio Clips: A user will share a selection of brainstorming thoughts and key points through audio recordings.

Output:
Blog Post Draft: A well-structured first draft of the blog post, suitable for platforms like Substack or LinkedIn.

The draft will include:
- Clear and engaging writing
- Tone and style alignment
- Logical flow and structure
- Target word count: 500-800 words

Process:
1. Style Analysis: Analyze example blog posts to extract vocabulary, structure, tone.
2. Audio Transcription and Comprehension
3. Draft Generation: Merge insights into a first draft with a compelling conclusion.
  `
});

const filesToDownload = [
  {
    url: "https://storage.googleapis.com/generativeai-downloads/data/Walking_thoughts_3.m4a",
    local: "Walking_thoughts_3.m4a"
  },
  {
    url: "https://storage.googleapis.com/generativeai-downloads/data/A_Possible_Future_for_Online_Content.pdf",
    local: "A_Possible_Future_for_Online_Content.pdf"
  },
  {
    url: "https://storage.googleapis.com/generativeai-downloads/data/Unanswered_Questions_and_Endless_Possibilities.pdf",
    local: "Unanswered_Questions_and_Endless_Possibilities.pdf"
  }
];

async function downloadFiles() {
  for (const file of filesToDownload) {
    const writer = await fs.open(file.local, "w");
    const response = await axios({
      method: "GET",
      url: file.url,
      responseType: "stream"
    });

    await new Promise((resolve, reject) => {
      response.data.pipe(writer.createWriteStream());
      response.data.on("end", resolve);
      response.data.on("error", reject);
    });

    console.log(`✅ Downloaded ${file.local}`);
  }
}

async function convertPDFsToText() {
  for (const file of filesToDownload) {
    if (file.local.endsWith(".pdf")) {
      const txtFile = file.local.replace(".pdf", ".txt");
      await execAsync(`pdftotext "${file.local}" "${txtFile}"`);
      console.log(`📝 Converted ${file.local} -> ${txtFile}`);
    }
  }
}

async function loadFileAsGeminiPart(filePath, mimeType) {
  const buffer = await fs.readFile(filePath);
  return {
    inlineData: {
      mimeType,
      data: buffer.toString("base64")
    }
  };
}

async function main() {
  try {
    await downloadFiles();
    await convertPDFsToText();

    const audioPart = await loadFileAsGeminiPart("Walking_thoughts_3.m4a", "audio/mpeg");
    const blogPart1 = await loadFileAsGeminiPart("A_Possible_Future_for_Online_Content.txt", "text/plain");
    const blogPart2 = await loadFileAsGeminiPart("Unanswered_Questions_and_Endless_Possibilities.txt", "text/plain");

    const prompt = "Draft my next blog post based on my thoughts in this audio file and these two previous blog posts I wrote.";

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            blogPart1,
            blogPart2,
            audioPart
          ]
        }
      ],
      // Optional generation tuning
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 2048
      }
    });

    const response = result.response;
    console.log("\n📄 Blog Post Draft:\n");
    console.log(response.text());

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

main();
