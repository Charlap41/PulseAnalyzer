const API_KEY = "AIzaSyBqdI1akRIhrE79O1yZBwJlJFCQsf8tbRA";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    console.log("Listing models...");
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("Error:", response.status, response.statusText);
            console.error("Details:", JSON.stringify(data, null, 2));
        } else {
            console.log("Models found:");
            if (data.models) {
                data.models.forEach(m => console.log(`- ${m.name}`));
            } else {
                console.log("No models returned (empty list).");
            }
        }
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

listModels();
