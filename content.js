// content.js

// guard against extension reload — old scripts become invalid
function isContextValid() {
    try { return !!chrome.runtime?.id; } catch (e) { return false; }
}

function injectScript() {
    if (!isContextValid()) return;
    try {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("inject.js");
        script.onload = () => script.remove();
        document.documentElement.appendChild(script);
    } catch (e) { /* context invalidated */ }
}

// ─── State ────────────────────────────────────────────────────────────
let extractedCode = null;

window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === "LEETCODE_CODE") {
        extractedCode = event.data.code;
        if (isContextValid()) {
            try { chrome.storage.local.set({ leetcodeCode: event.data.code }); } catch (e) {}
        }
    }
});

// ─── Styles ───────────────────────────────────────────────────────────
function injectStyles() {
    if (document.getElementById("lce-styles")) return;

    const style = document.createElement("style");
    style.id = "lce-styles";
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

        /* ── Button ── */
        #lce-analyze-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 22px;
            border: none;
            border-radius: 14px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: #fff;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 13px;
            font-weight: 600;
            cursor: grab;
            box-shadow: 0 4px 24px rgba(99, 102, 241, 0.45),
                        0 0 0 1px rgba(255,255,255,0.1) inset;
            transition: box-shadow 0.3s, background 0.3s, opacity 0.3s;
            user-select: none;
            touch-action: none;
        }
        #lce-analyze-btn:hover {
            box-shadow: 0 8px 32px rgba(99, 102, 241, 0.6);
            background: linear-gradient(135deg, #818cf8, #a78bfa);
        }
        #lce-analyze-btn.lce-dragging { cursor: grabbing; opacity: 0.9; }
        #lce-analyze-btn.lce-loading {
            pointer-events: none;
            opacity: 0.85;
        }
        #lce-analyze-btn.lce-loading .lce-icon {
            animation: lce-pulse 1s ease-in-out infinite;
        }
        @keyframes lce-pulse {
            0%,100% { opacity:1; } 50% { opacity:0.3; }
        }

        /* ── Result Card ── */
        #lce-card {
            position: fixed;
            bottom: 80px;
            right: 24px;
            z-index: 99999;
            width: 320px;
            background: #111118;
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 16px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.5),
                        0 0 0 1px rgba(255,255,255,0.04) inset;
            font-family: 'Inter', system-ui, sans-serif;
            overflow: hidden;
            opacity: 0;
            transform: translateY(12px) scale(0.96);
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        }
        #lce-card.lce-visible {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
        }

        /* card header */
        .lce-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(255,255,255,0.02);
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lce-card-header span {
            font-size: 13px;
            font-weight: 700;
            color: #e2e8f0;
        }
        .lce-card-close {
            background: none;
            border: none;
            color: #64748b;
            font-size: 16px;
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .lce-card-close:hover {
            background: rgba(255,255,255,0.08);
            color: #e2e8f0;
        }

        /* card body */
        .lce-card-body {
            padding: 14px 16px;
        }

        /* row style */
        .lce-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            font-size: 12.5px;
        }
        .lce-row:last-child { border-bottom: none; }
        .lce-row-label {
            color: #64748b;
            font-weight: 500;
        }
        .lce-row-value {
            color: #e2e8f0;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
            font-size: 12px;
        }

        /* approach tags */
        .lce-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            justify-content: flex-end;
            max-width: 180px;
        }
        .lce-tag {
            background: rgba(99, 102, 241, 0.15);
            color: #a5b4fc;
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-family: 'Inter', system-ui, sans-serif;
            font-weight: 500;
        }

        /* rating badge */
        .lce-rating {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
            font-size: 12px;
        }
        .lce-rating-good { color: #4ade80; }
        .lce-rating-mid  { color: #facc15; }
        .lce-rating-bad  { color: #f87171; }

        /* suggestion */
        .lce-suggestion {
            margin-top: 6px;
            padding: 10px 12px;
            background: rgba(250, 204, 21, 0.06);
            border: 1px solid rgba(250, 204, 21, 0.1);
            border-radius: 10px;
            font-size: 11.5px;
            color: #d4c074;
            line-height: 1.5;
        }
        .lce-suggestion strong {
            color: #facc15;
            font-size: 11px;
        }

        /* best approach */
        .lce-best {
            margin-top: 6px;
            padding: 10px 12px;
            background: rgba(74, 222, 128, 0.06);
            border: 1px solid rgba(74, 222, 128, 0.12);
            border-radius: 10px;
            font-size: 11.5px;
            color: #86d9a0;
            line-height: 1.5;
        }
        .lce-best strong {
            color: #4ade80;
            font-size: 11px;
        }

        /* optimal complexity section */
        .lce-optimal {
            margin-top: 8px;
            padding: 10px 12px;
            border-radius: 10px;
            font-size: 11.5px;
            line-height: 1.6;
        }
        .lce-optimal-match {
            background: rgba(74, 222, 128, 0.06);
            border: 1px solid rgba(74, 222, 128, 0.12);
            color: #86d9a0;
        }
        .lce-optimal-diff {
            background: rgba(251, 191, 36, 0.06);
            border: 1px solid rgba(251, 191, 36, 0.12);
            color: #d4c074;
        }
        .lce-optimal strong {
            font-size: 11px;
            display: block;
            margin-bottom: 4px;
        }
        .lce-optimal-match strong { color: #4ade80; }
        .lce-optimal-diff strong { color: #fbbf24; }
        .lce-optimal-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 12px;
            margin-top: 4px;
        }
        .lce-optimal-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
        }
        .lce-optimal-label {
            opacity: 0.7;
        }
        .lce-optimal-val {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
            font-size: 11px;
        }

        /* skeleton */
        .lce-card-skeleton .lce-row-value {
            background: linear-gradient(90deg,
                rgba(255,255,255,0.04) 25%,
                rgba(255,255,255,0.08) 50%,
                rgba(255,255,255,0.04) 75%);
            background-size: 200% 100%;
            animation: lce-shimmer 1.5s infinite;
            border-radius: 4px;
            width: 70px;
            height: 14px;
            display: inline-block;
        }
        @keyframes lce-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* toast */
        #lce-toast {
            position: fixed;
            bottom: 80px;
            right: 360px;
            z-index: 100002;
            padding: 8px 16px;
            border-radius: 10px;
            background: rgba(30, 30, 40, 0.95);
            color: #e2e8f0;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 12px;
            font-weight: 500;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            opacity: 0;
            transform: translateX(8px);
            transition: all 0.3s ease;
            pointer-events: none;
        }
        #lce-toast.lce-show {
            opacity: 1;
            transform: translateX(0);
        }
    `;
    document.head.appendChild(style);
}

// ─── Build Card ───────────────────────────────────────────────────────
function injectCard() {
    if (document.getElementById("lce-card")) return;

    const card = document.createElement("div");
    card.id = "lce-card";
    card.innerHTML = `
        <div class="lce-card-header">
            <span>🧠 Analysis</span>
            <button class="lce-card-close">✕</button>
        </div>
        <div class="lce-card-body" id="lce-card-body">
            <p style="color:#4a5568;font-size:12px;margin:0;">Click Analyze to start.</p>
        </div>
    `;
    document.body.appendChild(card);

    card.querySelector(".lce-card-close").addEventListener("click", () => {
        card.classList.remove("lce-visible");
    });
}

function showCard() {
    document.getElementById("lce-card")?.classList.add("lce-visible");
}
function hideCard() {
    document.getElementById("lce-card")?.classList.remove("lce-visible");
}

function ratingClass(n) {
    if (n >= 7) return "lce-rating-good";
    if (n >= 4) return "lce-rating-mid";
    return "lce-rating-bad";
}

function showLoadingCard() {
    const body = document.getElementById("lce-card-body");
    if (!body) return;
    body.innerHTML = `
        <div class="lce-card-skeleton">
            <div class="lce-row"><span class="lce-row-label">Time</span><span class="lce-row-value"></span></div>
            <div class="lce-row"><span class="lce-row-label">Space</span><span class="lce-row-value"></span></div>
            <div class="lce-row"><span class="lce-row-label">Best Time</span><span class="lce-row-value"></span></div>
            <div class="lce-row"><span class="lce-row-label">Best Space</span><span class="lce-row-value"></span></div>
            <div class="lce-row"><span class="lce-row-label">Approach</span><span class="lce-row-value"></span></div>
            <div class="lce-row"><span class="lce-row-label">Code</span><span class="lce-row-value"></span></div>
        </div>
    `;
    showCard();
}

function showResultCard(data) {
    const body = document.getElementById("lce-card-body");
    if (!body) return;

    const approaches = (data.approaches || []).map(a =>
        `<span class="lce-tag">${escapeHtml(a)}</span>`
    ).join("");

    const approachR = data.approachRating ?? "?";
    const codeR = data.codeRating ?? "?";

    // Determine if user's solution is already optimal
    const bestTime = data.bestTime || data.time || "?";
    const bestSpace = data.bestSpace || data.space || "?";
    const isTimeOptimal = data.time && data.bestTime && data.time.trim() === data.bestTime.trim();
    const isSpaceOptimal = data.space && data.bestSpace && data.space.trim() === data.bestSpace.trim();
    const isFullyOptimal = isTimeOptimal && isSpaceOptimal;

    let html = `
        <div class="lce-row">
            <span class="lce-row-label">⏱ Time</span>
            <span class="lce-row-value">${escapeHtml(data.time || "?")}</span>
        </div>
        <div class="lce-row">
            <span class="lce-row-label">💾 Space</span>
            <span class="lce-row-value">${escapeHtml(data.space || "?")}</span>
        </div>
        <div class="lce-row">
            <span class="lce-row-label">🧩 Approach</span>
            <div class="lce-tags">${approaches || '<span class="lce-row-value">?</span>'}</div>
        </div>
        <div class="lce-row">
            <span class="lce-row-label">🧩 Approach</span>
            <span class="lce-rating ${ratingClass(approachR)}">${approachR}/10</span>
        </div>
        <div class="lce-row">
            <span class="lce-row-label">💻 Code</span>
            <span class="lce-rating ${ratingClass(codeR)}">${codeR}/10</span>
        </div>
    `;

    // Optimal complexity section
    const optClass = isFullyOptimal ? "lce-optimal-match" : "lce-optimal-diff";
    const optIcon = isFullyOptimal ? "✅" : "🎯";
    const optLabel = isFullyOptimal ? "Your solution is optimal!" : "Best Possible Complexity";
    html += `
        <div class="lce-optimal ${optClass}">
            <strong>${optIcon} ${optLabel}</strong>
            <div class="lce-optimal-grid">
                <div class="lce-optimal-item">
                    <span class="lce-optimal-label">⏱ Time</span>
                    <span class="lce-optimal-val">${escapeHtml(bestTime)}</span>
                </div>
                <div class="lce-optimal-item">
                    <span class="lce-optimal-label">💾 Space</span>
                    <span class="lce-optimal-val">${escapeHtml(bestSpace)}</span>
                </div>
            </div>
        </div>
    `;

    if (data.suggestion) {
        html += `
            <div class="lce-suggestion">
                <strong>💡 Tip:</strong> ${escapeHtml(data.suggestion)}
            </div>
        `;
    }

    if (data.bestApproach) {
        html += `
            <div class="lce-best">
                <strong>🏆 Best Approach:</strong> ${escapeHtml(data.bestApproach)}
            </div>
        `;
    }

    body.innerHTML = html;
    showCard();
}

function showErrorCard(message) {
    const body = document.getElementById("lce-card-body");
    if (!body) return;
    body.innerHTML = `<p style="color:#f87171;font-size:12px;margin:0;">⚠ ${escapeHtml(message)}</p>`;
    showCard();
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Button ───────────────────────────────────────────────────────────
function injectButton() {
    if (document.getElementById("lce-analyze-btn")) return;

    const toast = document.createElement("div");
    toast.id = "lce-toast";
    document.body.appendChild(toast);

    const btn = document.createElement("button");
    btn.id = "lce-analyze-btn";
    btn.innerHTML = `<span class="lce-icon">🧠</span> Analyze`;
    btn.title = "Drag to move, click to analyze";
    document.body.appendChild(btn);

    // restore saved position
    const saved = localStorage.getItem("lce-btn-pos");
    if (saved) {
        const { x, y } = JSON.parse(saved);
        btn.style.left = x + "px";
        btn.style.top = y + "px";
        btn.style.right = "auto";
        btn.style.bottom = "auto";
    }

    // drag logic
    let isDragging = false;
    let wasDragged = false;
    let startX, startY, btnX, btnY;

    btn.addEventListener("pointerdown", (e) => {
        if (cooldownActive) return;
        isDragging = true;
        wasDragged = false;
        startX = e.clientX;
        startY = e.clientY;
        const rect = btn.getBoundingClientRect();
        btnX = rect.left;
        btnY = rect.top;
        btn.classList.add("lce-dragging");
        btn.setPointerCapture(e.pointerId);
    });

    btn.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDragged = true;
        if (!wasDragged) return;
        let newX = btnX + dx;
        let newY = btnY + dy;
        // clamp to viewport
        newX = Math.max(0, Math.min(newX, window.innerWidth - btn.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - btn.offsetHeight));
        btn.style.left = newX + "px";
        btn.style.top = newY + "px";
        btn.style.right = "auto";
        btn.style.bottom = "auto";
    });

    btn.addEventListener("pointerup", (e) => {
        if (!isDragging) return;
        isDragging = false;
        btn.classList.remove("lce-dragging");
        if (wasDragged) {
            // save position
            localStorage.setItem("lce-btn-pos", JSON.stringify({
                x: parseInt(btn.style.left),
                y: parseInt(btn.style.top)
            }));
        } else {
            handleAnalyze();
        }
    });
}

let cooldownActive = false;

async function handleAnalyze() {
    if (cooldownActive) return;

    const btn = document.getElementById("lce-analyze-btn");
    btn.classList.add("lce-loading");
    btn.innerHTML = `<span class="lce-icon">🧠</span> Analyzing...`;

    showLoadingCard();

    // extract fresh code
    extractedCode = null;
    injectScript();

    await new Promise((resolve) => {
        let waited = 0;
        const check = setInterval(() => {
            waited += 200;
            if (extractedCode || waited > 5000) {
                clearInterval(check);
                resolve();
            }
        }, 200);
    });

    if (!extractedCode) {
        showErrorCard("Could not extract code from editor. Please reload the page.");
        resetButton();
        return;
    }

    if (!isContextValid()) {
        showErrorCard("Extension was reloaded. Please refresh the page.");
        resetButton();
        return;
    }

    try {
        chrome.runtime.sendMessage(
            { type: "ANALYZE_CODE", code: extractedCode },
            (response) => {
                if (chrome.runtime.lastError) {
                    showErrorCard(chrome.runtime.lastError.message);
                } else if (response && response.success) {
                    showResultCard(response.analysis);
                    showToast("✅ Done");
                } else {
                    showErrorCard(response?.error || "Unknown error");
                }
                startCooldown();
            }
        );
    } catch (e) {
        showErrorCard("Extension was reloaded. Please refresh the page.");
        resetButton();
    }
}

function startCooldown() {
    const btn = document.getElementById("lce-analyze-btn");
    if (!btn) return;

    cooldownActive = true;
    btn.classList.remove("lce-loading");

    let seconds = 10;
    btn.innerHTML = `<span class="lce-icon">⏳</span> Wait ${seconds}s`;
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";

    const timer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(timer);
            cooldownActive = false;
            btn.innerHTML = `<span class="lce-icon">🧠</span> Analyze`;
            btn.style.opacity = "";
            btn.style.pointerEvents = "";
        } else {
            btn.innerHTML = `<span class="lce-icon">⏳</span> Wait ${seconds}s`;
        }
    }, 1000);
}

function resetButton() {
    const btn = document.getElementById("lce-analyze-btn");
    if (!btn) return;
    btn.classList.remove("lce-loading");
    btn.innerHTML = `<span class="lce-icon">🧠</span> Analyze`;
}

function showToast(msg) {
    const t = document.getElementById("lce-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("lce-show");
    setTimeout(() => t.classList.remove("lce-show"), 2000);
}

// ─── Wait for editor ─────────────────────────────────────────────────
function waitForEditor() {
    let injected = false;
    function tryInject() {
        if (injected) return;
        const hasEditor = document.querySelector(".monaco-editor") ||
                          document.querySelector(".cm-editor") ||
                          document.querySelector(".CodeMirror") ||
                          document.querySelector(".ace_editor");
        if (hasEditor) {
            injected = true;
            injectStyles();
            injectCard();
            injectButton();
            injectScript();
        }
    }
    tryInject();
    const obs = new MutationObserver(() => { tryInject(); if (injected) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    const iv = setInterval(() => { tryInject(); if (injected) clearInterval(iv); }, 1000);
    setTimeout(() => { clearInterval(iv); obs.disconnect(); if (!injected) { injectStyles(); injectCard(); injectButton(); } }, 30000);
}

// ─── SPA nav ──────────────────────────────────────────────────────────
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        ["lce-analyze-btn","lce-toast","lce-card"].forEach(id => document.getElementById(id)?.remove());
        extractedCode = null;
        if (location.href.includes("/problems/") || location.href.includes("/challenges/") || location.href.includes("/submit/")) waitForEditor();
    }
}).observe(document.body, { childList: true, subtree: true });

waitForEditor();