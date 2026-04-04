// background.js

const cache = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ANALYZE_CODE") {
        const key = request.code.length + request.code.slice(0, 100);
        if (cache.has(key)) {
            sendResponse({ success: true, analysis: cache.get(key) });
            return true;
        }
        chrome.storage.local.get(["provider", "apiKey", "model", "endpoint"], (config) => {
            if (!config.apiKey) {
                sendResponse({ success: false, error: "No API key set. Click the extension icon to configure." });
                return;
            }
            callAI(config, request.code)
                .then(r => { cache.set(key, r); sendResponse({ success: true, analysis: r }); })
                .catch(e => sendResponse({ success: false, error: e.message }));
        });
        return true;
    }
});

async function callAI(config, code) {
    const prompt = `Analyze this code. Reply ONLY valid JSON, nothing else:\n{"time":"O(?)","space":"O(?)","approaches":["name"],"approachRating":0,"codeRating":0,"suggestion":"text or null","bestApproach":"Name the optimal approach for this problem and explain in 1 short sentence why it is best"}\n\nCode:\n${code}`;

    if (config.provider === "gemini") {
        return callGemini(config, prompt);
    } else {
        return callOpenAICompatible(config, prompt);
    }
}

// ─── OpenAI-compatible (Groq, OpenAI, custom) ────────────────────────
async function callOpenAICompatible(config, prompt) {
    const urls = {
        groq: "https://api.groq.com/openai/v1/chat/completions",
        openai: "https://api.openai.com/v1/chat/completions"
    };
    const url = config.provider === "custom" ? config.endpoint : urls[config.provider];

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            max_completion_tokens: 512
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error ${res.status}`);
    }

    const text = (await res.json()).choices?.[0]?.message?.content;
    return extractJson(text);
}

// ─── Google Gemini ───────────────────────────────────────────────────
async function callGemini(config, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 800 }
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error ${res.status}`);
    }

    const text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text;
    return extractJson(text);
}

// ─── Extract JSON from response ──────────────────────────────────────
function extractJson(text) {
    if (!text) throw new Error("Empty response from AI");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON in response");
    return JSON.parse(m[0]);
}
