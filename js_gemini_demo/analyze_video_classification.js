import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import fs from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import * as cv from 'opencv4nodejs'; // For video frame extraction

const pipelineAsync = promisify(pipeline);

// Initialize the Gemini client
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable not set");
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const MODEL_ID = "gemini-1.5-flash"; // Using latest model

// Configuration
const videoUrl = "https://upload.wikimedia.org/wikipedia/commons/8/81/American_black_bears_%28Ursus_americanus%29.webm";
const localVideoPath = "black_bear.webm";
const systemPrompt = `You are a zoologist whose job is to name animals in videos.
You should always provide an english and latin name.`;

async function downloadVideo(url, outputPath) {
    console.log("Downloading video...");
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(outputPath);
    await pipelineAsync(response.data, writer);
    console.log("Video downloaded successfully");
}

async function extractFirstFrame(videoPath) {
    console.log("Extracting first frame...");
    const videoCapture = new cv.VideoCapture(videoPath);
    const frame = videoCapture.read();
    
    if (frame.empty) {
        throw new Error("Could not extract frame from video");
    }
    
    // Convert BGR to RGB
    const frameRgb = frame.cvtColor(cv.COLOR_BGR2RGB);
    
    // Save frame for display
    const framePath = 'first_frame.jpg';
    cv.imwrite(framePath, frameRgb);
    console.log("First frame extracted and saved");
    
    videoCapture.release();
    return framePath;
}

async function uploadFile(client, filePath) {
    console.log("Uploading video file...");
    // Note: The Google Generative AI JavaScript SDK doesn't directly support file uploads
    // as shown in the Python version. This is a conceptual implementation.
    
    // In a real implementation, you would:
    // 1. Read the file content
    const fileContent = fs.readFileSync(filePath);
    
    // 2. Convert to base64 or another format the API accepts
    const base64Content = fileContent.toString('base64');
    
    // 3. Send to the API (this part is conceptual)
    // The actual implementation would depend on the API's file upload endpoint
    const file = {
        name: filePath,
        content: base64Content,
        mimeType: 'video/webm'
    };
    
    console.log("Video file uploaded (conceptual)");
    return file;
}

async function identifyAnimal(client, videoFile) {
    console.log("Identifying animal in video...");
    const model = client.getGenerativeModel({ 
        model: MODEL_ID,
        systemInstruction: systemPrompt
    });

    // Note: The JavaScript SDK handles files differently than Python
    // This is a conceptual implementation
    const result = await model.generateContent([
        "Please identify the animal(s) in this video",
        {
            inlineData: {
                data: videoFile.content,
                mimeType: videoFile.mimeType
            }
        }
    ]);
    
    const response = await result.response;
    return response.text();
}

async function main() {
    try {
        // Download the video
        await downloadVideo(videoUrl, localVideoPath);
        
        // Extract first frame (optional, just like in Python)
        const framePath = await extractFirstFrame(localVideoPath);
        console.log(`First frame saved to ${framePath}`);
        
        // Upload video (conceptual)
        const videoFile = await uploadFile(genAI, localVideoPath);
        
        // Identify animal
        const identification = await identifyAnimal(genAI, videoFile);
        console.log("\nAnimal Identification:");
        console.log(identification);
        
        // Clean up
        fs.unlinkSync(localVideoPath);
        fs.unlinkSync(framePath);
        console.log("Temporary files deleted");
        
    } catch (error) {
        console.error("Error:", error);
    }
}

main();