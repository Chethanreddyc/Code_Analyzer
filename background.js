// background.js

const cache = new Map();

// ─── Savage Error Messages 💀 ─────────────────────────────────────────
const SAVAGE_ERRORS = {
    rateLimit: [
        "🛑 Chill out, speed demon! The API has feelings too.",
        "🐌 Slow down! You're clicking faster than your code runs.",
        "⏰ Rate limited! Maybe take a break and actually READ your code?",
        "🔥 Stop spamming! The AI needs a cigarette break after your last code.",
        "💀 You got rate limited. Even the API is tired of your brute force approach.",
        "🚫 Easy there, turbo. The API isn't your ex — stop blowing it up.",
        "⛔ Rate limited! Your spam game is stronger than your coding game."
    ],
    network: [
        "📡 No internet? In 2026? Really?",
        "🌐 Check your WiFi, genius. Can't analyze code with carrier pigeons.",
        "🔌 Your internet just ragequit. Fix it.",
        "💀 Network error — did you forget to pay your ISP again?",
        "📶 Connection failed. Your WiFi is as unstable as your code.",
        "🛜 No connection detected. Are you coding in a cave?",
        "🐢 Network's dead. Maybe try submitting your code via fax?"
    ],
    auth: [
        "🔑 Invalid API key. Did you just mash your keyboard?",
        "🚪 Authentication failed. Wrong key, wrong door, wrong life choices.",
        "🤡 That API key is about as valid as your variable naming conventions.",
        "🔐 Access denied! Your API key has less authority than an unpaid intern.",
        "❌ Bad API key. Copy-paste isn't that hard... or is it?"
    ],
    noKey: [
        "🤦 No API key? Click the extension icon, genius.",
        "🔑 API key missing. It's like showing up to a race without shoes.",
        "💀 No API key configured. Were you planning to analyze code telepathically?",
        "⚙️ Set up your API key first. I'm an analyzer, not a mind reader.",
        "🧠 Big brain move: trying to use AI without an API key."
    ],
    emptyResponse: [
        "🫥 AI returned nothing. Even it was speechless by your code.",
        "👻 Empty response. Your code scared the AI into silence.",
        "💨 The AI ghosted you. Maybe your code was too cursed.",
        "🤐 AI went mute. It's processing... the trauma from your code.",
        "🕳️ Got nothing back. The AI looked at your code and chose violence (silence)."
    ],
    parseError: [
        "🤖 AI had a stroke trying to respond. Your code broke the bot.",
        "💥 Couldn't parse the response. Even the AI is confused by your code.",
        "🧩 Response was gibberish. Like your variable names.",
        "📦 Invalid response format. The AI tried its best, but your code was too chaotic."
    ],
    serverError: [
        "🔥 Server's on fire. Not your fault for once.",
        "💣 API server exploded. Probably couldn't handle another O(n³) solution.",
        "☠️ Server error. The AI is having an existential crisis.",
        "🪦 Server is dead. RIP. Press F.",
        "💀 Server went down harder than your code in a production deploy."
    ],
    timeout: [
        "⏳ Request timed out. Your code was so long the AI fell asleep reading it.",
        "🐌 Timed out! Even the AI couldn't finish — unlike your infinite loops.",
        "⏰ Timeout! The AI took one look and said 'nah, too much spaghetti.'"
    ],
    unknown: [
        "💀 Something broke. Congratulations, you found a new way to fail.",
        "🤷 Unknown error. Even we don't know what you did wrong.",
        "🎰 Random error! You're unlucky in code AND in life.",
        "⚠️ Mystery error. Your code is so unique it creates new bugs.",
        "🌀 Something went wrong. The universe simply rejected your code."
    ]
};

function getRandomMsg(category) {
    const msgs = SAVAGE_ERRORS[category] || SAVAGE_ERRORS.unknown;
    return msgs[Math.floor(Math.random() * msgs.length)];
}

function classifyError(status, errorMsg) {
    const msg = (errorMsg || "").toLowerCase();
    if (status === 429 || msg.includes("rate") || msg.includes("quota") || msg.includes("limit")) return "rateLimit";
    if (status === 401 || status === 403 || msg.includes("auth") || msg.includes("invalid") && msg.includes("key")) return "auth";
    if (status >= 500 || msg.includes("server") || msg.includes("internal")) return "serverError";
    if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted")) return "timeout";
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch") || msg.includes("err_internet") || msg.includes("dns")) return "network";
    return "unknown";
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ANALYZE_CODE") {
        const key = request.code.length + request.code.slice(0, 100);
        if (cache.has(key)) {
            sendResponse({ success: true, analysis: cache.get(key) });
            return true;
        }
        chrome.storage.local.get(["provider", "apiKey", "model", "endpoint"], (config) => {
            if (!config.apiKey) {
                sendResponse({ success: false, error: getRandomMsg("noKey") });
                return;
            }
            callAI(config, request.code, "analyze")
                .then(r => { cache.set(key, r); sendResponse({ success: true, analysis: r }); })
                .catch(e => {
                    const category = e._category || classifyError(e._status || 0, e.message);
                    sendResponse({ success: false, error: getRandomMsg(category) });
                });
        });
        return true;
    }

    if (request.type === "GENERATE_TEST_CASES") {
        const tcKey = "tc:" + (request.title || "") + (request.description || "").slice(0, 80);
        if (cache.has(tcKey)) {
            sendResponse({ success: true, testCases: cache.get(tcKey) });
            return true;
        }
        chrome.storage.local.get(["provider", "apiKey", "model", "endpoint"], (config) => {
            if (!config.apiKey) {
                sendResponse({ success: false, error: getRandomMsg("noKey") });
                return;
            }
            callAI(config, { title: request.title, description: request.description }, "testcases")
                .then(r => { cache.set(tcKey, r); sendResponse({ success: true, testCases: r }); })
                .catch(e => {
                    const category = e._category || classifyError(e._status || 0, e.message);
                    sendResponse({ success: false, error: getRandomMsg(category) });
                });
        });
        return true;
    }
});

async function callAI(config, payload, requestType) {
    let prompt;
    if (requestType === "testcases") {
        prompt = buildTestCasesPrompt(payload.title, payload.description);
    } else {
        prompt = `Analyze this code. Reply ONLY valid JSON, nothing else:\n{"time":"O(?)","space":"O(?)","bestTime":"O(?)","bestSpace":"O(?)","approaches":["name"],"approachRating":0,"codeRating":0,"suggestion":"text or null","bestApproach":"Name the optimal approach for this problem and explain in 1 short sentence why it is best"}\nIMPORTANT: "time" and "space" are the complexity of the given code. "bestTime" and "bestSpace" are the best possible (optimal) time and space complexity achievable for this problem by any algorithm. If the given code is already optimal, bestTime/bestSpace should match time/space.\n\nCode:\n${payload}`;
    }

    if (config.provider === "gemini") {
        return callGemini(config, prompt, requestType);
    } else {
        return callOpenAICompatible(config, prompt, requestType);
    }
}

function buildTestCasesPrompt(title, description) {
    return `You are a coding problem expert. Given the following LeetCode problem, generate 2 or 3 representative example test cases that cover edge cases and typical scenarios.

Problem Title: ${title || "(unknown)"}
Problem Description:
${description || "(not provided)"}

Reply ONLY with valid JSON — no markdown, no explanation, nothing else:
[
  {"label": "Basic case", "input": "<input here>", "output": "<expected output>", "explanation": "<why this case matters>"},
  {"label": "Edge case", "input": "<input here>", "output": "<expected output>", "explanation": "<why this case matters>"}
]
Provide 2–3 test cases. Each must have: label, input, output, and explanation.`;
}

// ─── OpenAI-compatible (Groq, OpenAI, custom) ────────────────────────
async function callOpenAICompatible(config, prompt, requestType) {
    const urls = {
        groq: "https://api.groq.com/openai/v1/chat/completions",
        openai: "https://api.openai.com/v1/chat/completions"
    };
    const url = config.provider === "custom" ? config.endpoint : urls[config.provider];
    const maxTokens = requestType === "testcases" ? 1024 : 512;

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
            max_completion_tokens: maxTokens
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error?.message || `Error ${res.status}`);
        e._status = res.status;
        e._category = classifyError(res.status, err.error?.message);
        throw e;
    }

    const text = (await res.json()).choices?.[0]?.message?.content;
    return extractJson(text, requestType);
}

// ─── Google Gemini ───────────────────────────────────────────────────
async function callGemini(config, prompt, requestType) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
    const maxTokens = requestType === "testcases" ? 1200 : 800;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: maxTokens }
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error?.message || `Error ${res.status}`);
        e._status = res.status;
        e._category = classifyError(res.status, err.error?.message);
        throw e;
    }

    const text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text;
    return extractJson(text, requestType);
}

// ─── Extract JSON from response ──────────────────────────────────────
function extractJson(text, requestType) {
    if (!text) {
        const e = new Error("Empty response");
        e._category = "emptyResponse";
        throw e;
    }
    // For test cases we expect a JSON array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    const objMatch   = text.match(/\{[\s\S]*\}/);
    const m = requestType === "testcases" ? (arrayMatch || objMatch) : (objMatch || arrayMatch);
    if (!m) {
        const e = new Error("No JSON in response");
        e._category = "parseError";
        throw e;
    }
    try {
        return JSON.parse(m[0]);
    } catch (parseErr) {
        const e = new Error("Invalid JSON");
        e._category = "parseError";
        throw e;
    }
}
