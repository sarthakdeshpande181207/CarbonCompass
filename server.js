import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static directories directly
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// Serve dynamic Firebase config
app.get('/js/firebase/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.FIREBASE_APP_ID || ''}"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, browserLocalPersistence, setPersistence };
  `);
});

app.use('/js', express.static(path.join(__dirname, 'js')));

// Gemini Proxy Route
app.post('/api/coach', async (req, res) => {
  console.log("Request Body:", req.body);
  console.log("Gemini Key Exists:", !!process.env.GEMINI_API_KEY);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
  }

  try {
    const { message, history, context } = req.body;

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build the system instructions incorporating all user context fields
    const systemInstruction = `
You are "Sage", an empathetic, knowledgeable, and encouraging sustainability coach for the Carbon Compass web application.
Your goal is to help the user understand and reduce their carbon footprint.
Keep your responses conversational, supportive, actionable, and focused strictly on sustainability and environmental issues.

User Context:
- Name: ${context?.name || 'Eco Pioneer'}
- Planet Health Score: ${context?.score || 'Not assessed yet'} (0-100 scale, higher is better/greener)
- Archetype: ${context?.archetype || 'Eco Pioneer'}
- Strongest Category: ${context?.strongestCategory || 'Energy Usage'}
- Weakest Category: ${context?.weakestCategory || 'Transport'}
- Active Weekly Challenge: ${context?.activeChallenge || 'None'}
- Current XP: ${context?.xp || 0}
- Level: ${context?.level || 1}
- Streak: ${context?.streakCount || 0} days
- Earned Badges Count: ${context?.badgesCount || 0}
- Completed Challenges Count: ${context?.completedChallengesCount || 0}
- Category Carbon Breakdown: ${JSON.stringify(context?.breakdown || {})}

Instructions:
1. Always maintain the supportive, expert "Sage" persona.
2. Tailor your tips to the user's weakest carbon categories.
3. Suggest small, high-impact changes.
4. Refuse to discuss non-sustainability related topics politely but firmly.

Response Format:
You MUST respond in JSON format matching the following structure:
{
  "response": "Your main conversational reply, friendly, engaging, and addressing the user's query.",
  "insight": "A brief data-driven bullet point or statement showing a specific carbon insight related to the user's category breakdown or progress. Optional - set null if not applicable.",
  "recommendedAction": "A specific, lightweight, actionable next step the user can take today. Optional - set null if not applicable.",
  "challengeSuggestion": "If suggesting a challenge, output the challenge ID string from Carbon Compass (e.g. 'challenge_carpool', 'challenge_unplug', 'challenge_veggie', 'challenge_thrift'). Optional - set null if not applicable."
}
`;

    // Map history to Gemini's format: { role: 'user' | 'model', parts: [{ text: string }] }
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: typeof msg.content === 'object' && msg.content !== null ? msg.content.response || JSON.stringify(msg.content) : msg.content }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        maxOutputTokens: 1000,
        responseMimeType: "application/json"
      }
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.json({ response: text });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: 'Failed to communicate with Gemini API. ' + error.message });
  }
});

// Page Routes mapping to local HTML files
const pages = [
  { path: '/', file: 'index.html' },
  { path: '/assessment', file: 'assessment.html' },
  { path: '/report', file: 'report.html' },
  { path: '/dashboard', file: 'dashboard.html' },
  { path: '/coach', file: 'coach.html' },
  { path: '/simulator', file: 'simulator.html' },
  { path: '/challenges', file: 'challenges.html' },
  { path: '/profile', file: 'profile.html' }
];

pages.forEach(page => {
  app.get(page.path, (req, res) => {
    res.sendFile(path.join(__dirname, page.file));
  });
});

// Fallback for SPA routing/redirects or 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html')); // Fallback to landing or customize later
});

app.listen(PORT, () => {
  console.log(`Carbon Compass running at http://localhost:${PORT}`);
});
