const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// HTTPS Callable Function for AI Analysis
exports.analyzeSession = functions.https.onCall(async (data, context) => {
    // 1. Security Check: Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    // 2. Get API Key from Environment Configuration
    const API_KEY = functions.config().gemini.key;
    if (!API_KEY) {
        console.error("API Key missing in functions config");
        throw new functions.https.HttpsError(
            'internal',
            'Server configuration error (API Key missing).'
        );
    }

    const { prompt, model = 'gemini-2.5-pro' } = data;

    if (!prompt) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with a "prompt" argument.'
        );
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const aiModel = genAI.getGenerativeModel({ model: model });
        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        return { text: response.text() };
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new functions.https.HttpsError(
            'internal',
            'AI Analysis Failed',
            error.message
        );
    }
});
