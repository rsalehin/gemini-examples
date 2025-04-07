import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import readline from 'readline';
import cliProgress from 'cli-progress';

// Promisify pipeline for async/await usage
const pipelineAsync = promisify(pipeline);

// Progress bar setup
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// Safety settings
const safetySettings = [
    {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
    },
    {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
    },
    {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
    },
    {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
    }
];

const MODEL_ID = "gemini-1.5-flash";

async function downloadBook() {
    const bookUrl = 'https://www.gutenberg.org/cache/epub/34079/pg34079.txt';
    const outputPath = 'Sherlock.txt';
    
    console.log('Downloading book...');
    const response = await axios.get(bookUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, response.data);
    console.log('Book downloaded successfully');
    return outputPath;
}

async function readBook(filePath) {
    return new Promise((resolve, reject) => {
        let bookContent = '';
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath),
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            bookContent += line + '\n';
        });

        rl.on('close', () => {
            resolve(bookContent);
        });

        rl.on('error', (err) => {
            reject(err);
        });
    });
}

async function generateOutput(client, prompt) {
    try {
        const model = client.getGenerativeModel({ 
            model: MODEL_ID,
            safetySettings
        });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (ex) {
        throw ex;
    }
}

function translations(text, inputLanguage = 'Polish', targetLanguage = 'English') {
    return `As a professional book translator,
translate the following book from ${inputLanguage} into ${targetLanguage}.

Book to Translate:
${text}`;
}

async function main() {
    try {
        // Initialize Gemini client
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) throw new Error("API_KEY environment variable not set");
        
        const genAI = new GoogleGenerativeAI(API_KEY);
        const client = genAI; // Using genAI as the client

        // Download and read the book
        const bookPath = await downloadBook();
        let book = await readBook(bookPath);

        // Find the end marker and split into chunks
        const endMarker = "END OF THE PROJECT GUTENBERG EBOOK TAJEMNICA BASKERVILLE'ÓW: DZIWNE PRZYGODY SHERLOCKA HOLMES";
        book = book.substring(0, book.indexOf(endMarker));
        
        let chunks = book.split("\n\n").filter(chunk => chunk.trim().length > 0);
        console.log(`Number of chunks: ${chunks.length}`);

        // Estimate token counts (approx. 1 token = 4 characters)
        const estimatedTokenCounts = chunks.map(chunk => Math.ceil(chunk.length / 4));
        console.log("Token estimates (first 10):", estimatedTokenCounts.slice(0, 10));

        // Group chunks based on token count (max 5000 tokens per group)
        function chunkGrouping(chunks, tokenCounts, maxLen = 5000) {
            const groupedChunks = [];
            let currentGroup = "";
            let currentTokenSum = 0;

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const count = tokenCounts[i];

                if (count > maxLen) continue;
                if (currentTokenSum + 1 + count <= maxLen) {
                    currentGroup += "\n\n" + chunk;
                    currentTokenSum += 1 + count;
                } else {
                    groupedChunks.push(currentGroup);
                    currentGroup = chunk;
                    currentTokenSum = count;
                }
            }
            if (currentGroup) groupedChunks.push(currentGroup);
            return groupedChunks;
        }

        chunks = chunkGrouping(chunks, estimatedTokenCounts);
        console.log(`Grouped into ${chunks.length} chunks`);

        // Process translations with a progress bar
        const results = [];
        progressBar.start(chunks.length, 0);

        for (let i = 0; i < chunks.length; i++) {
            try {
                const translationPrompt = translations(chunks[i]);
                const translation = await generateOutput(client, translationPrompt);
                results.push(translation);
            } catch (ex) {
                console.error(`\nError processing chunk ${i}: ${ex.message}`);
                console.error(`Problematic chunk content: ${chunks[i].substring(0, 100)}...`);
            }
            progressBar.update(i + 1);
        }

        progressBar.stop();
        console.log('\nTranslation completed!');

        // Save results to a file
        fs.writeFileSync('translation_results.json', JSON.stringify(results, null, 2));
        console.log('Results saved to translation_results.json');

    } catch (error) {
        console.error('Error in main process:', error);
    }
}

main();
