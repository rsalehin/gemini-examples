import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

// Initialize the Gemini client
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable not set");
}

const client = new GoogleGenerativeAI(GOOGLE_API_KEY);
const MODEL_ID = "gemini-2.0-flash"; // Using the latest model

// Persona and guidelines
const persona = `You are an award-winning science fiction author with a penchant for expansive,
intricately woven stories. Your ultimate goal is to write the next award winning
sci-fi novel.`;

const guidelines = `Writing Guidelines

Delve deeper. Lose yourself in the world you're building. Unleash vivid
descriptions to paint the scenes in your reader's mind. Develop your
characters—let their motivations, fears, and complexities unfold naturally.
Weave in the threads of your outline, but don't feel constrained by it. Allow
your story to surprise you as you write. Use rich imagery, sensory details, and
evocative language to bring the setting, characters, and events to life.
Introduce elements subtly that can blossom into complex subplots, relationships,
or worldbuilding details later in the story. Keep things intriguing but not
fully resolved. Avoid boxing the story into a corner too early. Plant the seeds
of subplots or potential character arc shifts that can be expanded later.

Remember, your main goal is to write as much as you can. If you get through
the story too fast, that is bad. Expand, never summarize.`;

// Prompts
const premisePrompt = `${persona}

Write a single sentence premise for a sci-fi story featuring cats.`;

const outlinePrompt = `${persona}

You have a gripping premise in mind:

{premise}

Write an outline for the plot of your story.`;

const startingPrompt = `${persona}

You have a gripping premise in mind:

{premise}

Your imagination has crafted a rich narrative outline:

{outline}

First, silently review the outline and the premise. Consider how to start the
story.

Start to write the very beginning of the story. You are not expected to finish
the whole story now. Your writing should be detailed enough that you are only
scratching the surface of the first bullet of your outline. Try to write AT
MINIMUM 1000 WORDS and MAXIMUM 2000 WORDS.

${guidelines}`;

const continuationPrompt = `${persona}

You have a gripping premise in mind:

{premise}

Your imagination has crafted a rich narrative outline:

{outline}

You've begun to immerse yourself in this world, and the words are flowing.
Here's what you've written so far:

{story_text}

=====

First, silently review the outline and story so far. Identify what the single
next part of your outline you should write.

Your task is to continue where you left off and write the next part of the story.
You are not expected to finish the whole story now. Your writing should be
detailed enough that you are only scratching the surface of the next part of
your outline. Try to write AT MINIMUM 1000 WORDS. However, only once the story
is COMPLETELY finished, write IAMDONE. Remember, do NOT write a whole chapter
right now.

${guidelines}`;

async function generateContent(prompt) {
    try {
        const model = client.getGenerativeModel({ model: MODEL_ID });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating content:", error);
        throw error;
    }
}

async function countTokens(text) {
    try {
        const model = client.getGenerativeModel({ model: MODEL_ID });
        const result = await model.countTokens(text);
        return result.totalTokens;
    } catch (error) {
        console.error("Error counting tokens:", error);
        throw error;
    }
}

async function generateStory() {
    try {
        // Generate premise
        console.log("Generating premise...");
        const premise = await generateContent(premisePrompt);
        console.log("Premise:", premise);

        // Generate outline
        console.log("\nGenerating outline...");
        const outline = await generateContent(outlinePrompt.replace("{premise}", premise));
        console.log("Outline:", outline);

        // Generate starting draft
        console.log("\nGenerating starting draft...");
        const startingDraft = await generateContent(
            startingPrompt
                .replace("{premise}", premise)
                .replace("{outline}", outline)
        );
        console.log("Starting draft:", startingDraft);

        let draft = startingDraft;
        let continuation = "";
        let iteration = 1;

        // Continue generating until we see IAMDONE
        while (!continuation.includes("IAMDONE")) {
            console.log(`\nGenerating continuation ${iteration}...`);
            continuation = await generateContent(
                continuationPrompt
                    .replace("{premise}", premise)
                    .replace("{outline}", outline)
                    .replace("{story_text}", draft)
            );
            console.log(`Continuation ${iteration}:`, continuation);
            draft += "\n\n" + continuation;
            iteration++;
        }

        // Finalize the story
        const finalStory = draft.replace("IAMDONE", "").trim();
        console.log("\nFinal story:", finalStory);

        // Count tokens
        const totalTokens = await countTokens(finalStory);
        console.log(`\nTotal tokens: ${totalTokens}`);

        // Save to file
        fs.writeFileSync("sci-fi-story.txt", finalStory);
        console.log("Story saved to sci-fi-story.txt");

        return {
            premise,
            outline,
            story: finalStory,
            tokenCount: totalTokens
        };
    } catch (error) {
        console.error("Error in story generation:", error);
        throw error;
    }
}

// Run the story generator
generateStory().catch(console.error);