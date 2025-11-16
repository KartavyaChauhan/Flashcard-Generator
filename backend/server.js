const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

/**
 * This is our main helper function. It calls the LLM, validates the output,
 * and retries if the LLM gives a bad response.
 * This fulfills requirement #8.
 */
async function generateAndValidateFlashcards(topic, retries = 3) {
  // Ordered list of candidate model identifiers. The server will try each
  // in order and fall back if a model is unavailable.
  const candidateModels = [
    'models/gemini-2.5-flash',
    'models/gemini-2.5-flash-preview-05-20',
    'models/gemini-2.5-flash-lite',
    'models/gemini-flash-latest',
    // fallback to smaller Gemma models if flash variants are unavailable
    'models/gemma-3-1b-it',
    'models/gemma-3-4b-it'
  ];
  // Prompt instructing the model to emit a strict JSON array of 15 flashcards
  // with the required difficulty distribution.
  const prompt = `
    You are a flashcard generation assistant.
    Generate exactly 15 flashcards for the topic: "${topic}".
    You MUST provide:
    - Exactly 5 "easy" flashcards
    - Exactly 5 "medium" flashcards
    - Exactly 5 "hard" flashcards

    Respond with ONLY a single JSON array of objects, with no other text.
    Each object must have three keys: "question", "answer", and "difficulty".
    Example format:
    [
      { "question": "...", "answer": "...", "difficulty": "easy" },
      { "question": "...", "answer": "...", "difficulty": "medium" },
      { "question": "...", "answer": "...", "difficulty": "hard" }
    ]
  `;

  for (const modelName of candidateModels) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempt ${i + 1} with model ${modelName} for topic: ${topic}`);

        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Strip common markdown fences and trim
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const flashcards = JSON.parse(text);

        if (!Array.isArray(flashcards) || flashcards.length !== 15) {
          throw new Error(`Invalid number of flashcards: ${Array.isArray(flashcards) ? flashcards.length : 'not an array'}`);
        }

        const easyCount = flashcards.filter(c => c.difficulty === 'easy').length;
        const mediumCount = flashcards.filter(c => c.difficulty === 'medium').length;
        const hardCount = flashcards.filter(c => c.difficulty === 'hard').length;

        if (easyCount !== 5 || mediumCount !== 5 || hardCount !== 5) {
          throw new Error('Incorrect difficulty distribution.');
        }

        console.log(`Generated 15 flashcards with model ${modelName}.`);
        return flashcards;

      } catch (error) {
        const msg = (error && error.message) ? error.message : String(error);
        console.error(`Model ${modelName} attempt ${i + 1} failed:`, msg);

        const modelNotFound = /not found/i.test(msg) || /is not found for API version/i.test(msg);
        if (modelNotFound) break; // try next model
      }
    }
  }

  // If we reach here, no candidate model produced valid flashcards
  try {
    const modelsList = await genAI.listModels();
    const available = (modelsList && modelsList.models)
      ? modelsList.models.map(m => m.name || m.model || m)
      : modelsList;
    throw new Error('Failed to generate valid flashcards. Available models: ' + JSON.stringify(available));
  } catch (listErr) {
    throw new Error('Failed to generate valid flashcards and could not list models: ' + (listErr && listErr.message ? listErr.message : String(listErr)));
  }
}

// --- The API Endpoint ---
// This is what the frontend will call (Requirement #1)
app.post('/generate-flashcards', async (req, res) => {
  try {
    // Get the topic from the request body (Requirement #2)
    const { topic } = req.body;

    // Validation (Requirement #7)
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    // Call our function to get the flashcards
    const flashcards = await generateAndValidateFlashcards(topic);

    // Send the flashcards back to the frontend (Requirement #3, #4, #5)
    res.json(flashcards);

  } catch (error) {
    console.error('Error in /generate-flashcards endpoint:', error.message);
    // Send a "server error" response
    res.status(500).json({ error: 'Failed to generate flashcards.' });
  }
});

// Helpful debugging endpoint: list available models from the API
app.get('/models', async (req, res) => {
  try {
    // Some versions of the SDK don't expose listModels. Fall back to
    // calling the API directly using fetch and the same API base seen in errors.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment' });
    }

    // The Generative Language API accepts API keys via the `key` query
    // parameter or `x-goog-api-key` header. Using `?key=` avoids the
    // incorrect "Bearer" usage which causes a 401 here.
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const fetchOpts = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Use global fetch (Node 18+). If not available, this will throw.
    const resp = await fetch(url, fetchOpts);
    const data = await resp.text();
    let json;
    try {
      json = JSON.parse(data);
    } catch (err) {
      json = { raw: data };
    }
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Failed to list models', details: json });
    }
    return res.json(json);
  } catch (error) {
    console.error('Error listing models:', error && error.message ? error.message : error);
    res.status(500).json({ error: 'Failed to list models', details: String(error) });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
