// inject.js — runs in page context to access editor APIs

(function () {
    function getCode() {
        // Monaco editor (LeetCode, CodeChef)
        if (window.monaco) {
            const models = window.monaco.editor.getModels();
            if (models.length > 0) return models[0].getValue();
        }

        // Monaco DOM fallback
        const monacoLines = document.querySelectorAll(".view-lines .view-line");
        if (monacoLines.length > 0) {
            return Array.from(monacoLines).map(l => l.textContent).join("\n");
        }

        // CodeMirror 6 (newer editors)
        const cm6 = document.querySelector(".cm-content");
        if (cm6) return cm6.textContent;

        // CodeMirror 5 (HackerRank)
        const cm5 = document.querySelector(".CodeMirror");
        if (cm5 && cm5.CodeMirror) return cm5.CodeMirror.getValue();

        // CodeMirror 5 DOM fallback
        const cmLines = document.querySelectorAll(".CodeMirror-line");
        if (cmLines.length > 0) {
            return Array.from(cmLines).map(l => l.textContent).join("\n");
        }

        // Ace editor fallback (some older platforms)
        const aceEl = document.querySelector(".ace_editor");
        if (aceEl && window.ace) {
            const editor = window.ace.edit(aceEl);
            if (editor) return editor.getValue();
        }

        return null;
    }

    let attempts = 0;
    const interval = setInterval(() => {
        const code = getCode();
        attempts++;
        if (code) {
            clearInterval(interval);
            window.postMessage({ type: "LEETCODE_CODE", code }, "*");
        } else if (attempts >= 10) {
            clearInterval(interval);
            window.postMessage({
                type: "LEETCODE_CODE",
                code: "// Could not extract code. Make sure the editor is visible."
            }, "*");
        }
    }, 500);
})();