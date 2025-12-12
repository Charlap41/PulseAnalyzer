const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hardcoded key for testing (from user provided key)
const API_KEY = "AIzaSyBqdI1akRIhrE79O1yZBwJlJFCQsf8tbRA";

async function test() {
    console.log("Testing Gemini API with key:", API_KEY.substring(0, 10) + "...");
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Try gemini-pro as fallback
        console.log("Trying model: gemini-pro");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log("Sending request...");
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("SUCCESS! Response:", response.text());
    } catch (error) {
        console.error("FAILURE:", error);
        if (error.response) {
            console.error("Response Body:", await error.response.text());
        }
    }
}

test();
