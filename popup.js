// popup.js

const MODEL_HINTS = {
    groq: "e.g. llama-3.3-70b-versatile, mixtral-8x7b-32768",
    gemini: "e.g. gemini-3-flash-preview, gemini-2.0-flash",
    openai: "e.g. gpt-4o-mini, gpt-4o",
    custom: "Enter the model name for your endpoint"
};

const DEFAULT_MODELS = {
    groq: "llama-3.3-70b-versatile",
    gemini: "gemini-3-flash-preview",
    openai: "gpt-4o-mini",
    custom: ""
};

const providerEl = document.getElementById("provider");
const endpointSection = document.getElementById("endpointSection");
const endpointEl = document.getElementById("endpoint");
const apiKeyEl = document.getElementById("apiKey");
const modelEl = document.getElementById("model");
const hintEl = document.getElementById("modelHint");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggleKey");

// show/hide endpoint field for custom provider
providerEl.addEventListener("change", () => {
    const p = providerEl.value;
    endpointSection.style.display = p === "custom" ? "block" : "none";
    hintEl.textContent = MODEL_HINTS[p] || "";
    if (!modelEl.value || Object.values(DEFAULT_MODELS).includes(modelEl.value)) {
        modelEl.value = DEFAULT_MODELS[p] || "";
    }
});

// toggle key visibility
toggleBtn.addEventListener("click", () => {
    apiKeyEl.type = apiKeyEl.type === "password" ? "text" : "password";
});

// save
saveBtn.addEventListener("click", () => {
    const provider = providerEl.value;
    const apiKey = apiKeyEl.value.trim();
    const model = modelEl.value.trim();
    const endpoint = endpointEl.value.trim();

    if (!apiKey) return showStatus("API key is required", "error");
    if (!model) return showStatus("Model name is required", "error");
    if (provider === "custom" && !endpoint) return showStatus("Endpoint URL is required", "error");

    chrome.storage.local.set({ provider, apiKey, model, endpoint }, () => {
        showStatus("✓ Settings saved!", "success");
    });
});

// load saved settings
chrome.storage.local.get(["provider", "apiKey", "model", "endpoint"], (data) => {
    if (data.provider) providerEl.value = data.provider;
    if (data.apiKey) apiKeyEl.value = data.apiKey;
    if (data.model) modelEl.value = data.model;
    if (data.endpoint) endpointEl.value = data.endpoint;

    const p = providerEl.value;
    endpointSection.style.display = p === "custom" ? "block" : "none";
    hintEl.textContent = MODEL_HINTS[p] || "";
});

function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    setTimeout(() => { statusEl.textContent = ""; }, 3000);
}