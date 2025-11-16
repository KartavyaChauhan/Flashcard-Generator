
# Flashcard Generator — Internship Assignment

Lightweight full‑stack app that generates study flashcards using a generative model. The user
enters a topic in the frontend and the backend returns exactly 15 flashcards (5 easy / 5 medium /
5 hard).

**Repository layout**

- `frontend/` — static site: `index.html`, `style.css`, `app.js`
- `backend/` — Express server: `server.js`

## Prerequisites

- Node.js 18+ (required for the backend and for native `fetch` in Node)
- A Generative Language API key (Gemini) — stored in `backend/.env` as `GEMINI_API_KEY`

## Backend — Setup & Run

1. Open a terminal and go to the backend folder:

```powershell
cd C:\Users\karta\flashcard-generator\backend
```

2. Create a `.env` with your API key:

```text
GEMINI_API_KEY=your_real_api_key_here
```

3. Install dependencies and start the server:

```powershell
npm install express cors dotenv @google/generative-ai
# start server
node server.js
```

The server listens on `http://localhost:3000` and exposes:

- `POST /generate-flashcards` — generate flashcards
- `GET /models` — (debug) list available models from the API

## Frontend — Run

You can open the static `frontend/index.html` directly in your browser, or serve it on a local port.

Option A — Open file directly

```powershell
Start-Process C:\Users\karta\flashcard-generator\frontend\index.html
```

Option B — Serve with a small static server (recommended during development)

```powershell
cd C:\Users\karta\flashcard-generator\frontend
npx http-server -p 8080
# then open http://localhost:8080
```

Make sure the backend is running at `http://localhost:3000` before generating cards.

## Example API Request

Request:

```powershell
curl -X POST http://localhost:3000/generate-flashcards `
	-H "Content-Type: application/json" `
	-d '{"topic":"Photosynthesis"}'
```

Successful response (example snippet):

```json
[
	{ "question": "What is the primary pigment used in photosynthesis?", "answer": "Chlorophyll a", "difficulty": "easy" },
	
]
```

## Troubleshooting

- 401 / authentication errors: ensure `GEMINI_API_KEY` is correct in `backend/.env`.
- 404 / model not found: use `GET /models` to inspect supported model identifiers.
- Malformed JSON from the LLM: the backend retries generation and validates the shape; check server logs for detailed errors.


