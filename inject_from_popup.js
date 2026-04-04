// inject_from_popup.js — injected by popup.js via chrome.scripting.executeScript
// This runs as a content script, so it needs to inject into the page context

(function () {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("inject.js");
    script.onload = () => script.remove();
    document.documentElement.appendChild(script);

    // listen for the response
    function handler(event) {
        if (event.source !== window) return;
        if (event.data && event.data.type === "LEETCODE_CODE") {
            chrome.storage.local.set({ leetcodeCode: event.data.code });
            window.removeEventListener("message", handler);
        }
    }
    window.addEventListener("message", handler);
})();
