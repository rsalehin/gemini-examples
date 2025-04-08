# gemini-examples
Showcasing Personal Implementation of GSoC Gemini Project

# Gemini Examples Migration to JavaScript (New SDK)

This repository contains 7 examples from the [Google Gemini Cookbook](https://github.com/google-gemini/cookbook), updated to:
- **JavaScript/TypeScript** implementation
- **New Google AI SDK** (v1.0.0+)
- **Tested** locally with working demos

## 📋 Included Examples

| Example Name | Description | Status |
|--------------|-------------|--------|
| 🚀 Apollo 11 | Historical context analysis | ⚙️ Migration to JS/TS \| API Update |
| 🔺 Guess the Shape | Visual recognition | ⚙️ Migration to JS/TS \| API Update |
| 📖 Translate a Public Domain Book | Text processing pipeline | ⚙️ Migration to JS/TS \| API Update |
| ✍️ Story Writing | Creative writing assistant | ⚙️ Migration to JS/TS \| API Update |
| 🤖 Agents & Automatic Function Calling (Barista Bot) | Conversational AI | ⚙️ Migration to JS/TS \| API Update |
| 🎤 Voice Memo | Audio processing example | ⚙️ Migration to JS/TS \| API Update |
| 🐾 Opossum Search | Custom search engine implementation | ⚙️ Migration to JS/TS \| API Update |

## 🔄 SDK Migration Changes

### Key Differences Between Old (Python) and New (JavaScript) SDK

| Feature               | Old SDK (Python)                     | New SDK (JavaScript)                 |
|-----------------------|--------------------------------------|--------------------------------------|
| **Client Initialization** | `genai.configure(api_key=...)`       | `const client = new genai.Client(api_key)` |
| **File Handling**      | `genai.upload_file(path=...)`        | `await client.files.upload(file=...)` |
| **Model Interaction**  | `model = GenerativeModel(...)`       | Direct calls via `client.models.*`   |
| **Error Handling**     | Basic Python exceptions              | Structured `try/catch` with error types |
| **Content Generation** | `model.generate_content(...)`        | `client.models.generate_content(...)` |
| **Chat Sessions**      | `model.start_chat()`                 | `client.chats.create()`              |
| **Config Management**  | `generation_config=...` parameter    | `config: GenerateContentConfig` object |
| **Async Operations**   | `generate_content_async()`           | `client.aio.*` methods               |

### Code Comparison Example

**Old SDK (Python)**
```python
import google.generativeai as genai
genai.configure(api_key="...")
model = genai.GenerativeModel('gemini-pro')
response = model.generate_content("Hello")

## 🛠️ Tech Stack

- **Language**: JavaScript/TypeScript
- **SDK**: [google-genai](https://github.com/google/generative-ai-node) (v1.0.0+)
- **Package Manager**: npm
- **Testing**: Local validation

