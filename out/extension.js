"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    const disposable = vscode.commands.registerCommand("aiWebview.open", async () => {
        const panel = vscode.window.createWebviewPanel("aiWebview", "AI Webview", vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        panel.webview.html = getWebviewContent();
        // Forward an initial message if we have a saved key (so UI can show saved)
        (async () => {
            const saved = await context.secrets.get("ai_api_key");
            if (saved) {
                panel.webview.postMessage({ type: "apiKeySaved" });
            }
        })();
        const messageHandler = panel.webview.onDidReceiveMessage(async (message) => {
            try {
                if (!message || typeof message.type !== "string") {
                    return;
                }
                if (message.type === "saveApiKey") {
                    const apiKey = (message.apiKey || "").toString();
                    if (!apiKey) {
                        panel.webview.postMessage({ type: "error", message: "Empty API key received." });
                        return;
                    }
                    await context.secrets.store("ai_api_key", apiKey);
                    panel.webview.postMessage({ type: "apiKeySaved" });
                    return;
                }
                if (message.type === "loadUrl") {
                    // Optionally you could fetch the page or index it; we'll just acknowledge.
                    const url = (message.url || "").toString();
                    panel.webview.postMessage({ type: "pageContent", url });
                    return;
                }
                if (message.type === "ask") {
                    const question = (message.question || "").toString();
                    const pageText = (message.pageText || "").toString();
                    // Get API key from secret storage or env
                    const apiKey = (await context.secrets.get("ai_api_key")) ||
                        process.env.HUGGINGFACE_API_KEY ||
                        process.env.HF_API_KEY;
                    // If no API key, return a mock/fallback answer so UI remains usable during dev
                    if (!apiKey) {
                        const mockAnswer = `Mock reply (no API key found). Your question was: "${question}"\nContext: ${pageText || "(none)"}`;
                        panel.webview.postMessage({ type: "answer", answer: mockAnswer });
                        return;
                    }
                    // Build messages for HF chat router
                    const systemMsg = {
                        role: "system",
                        content: "You are a helpful assistant. Answer concisely and use any page context if available."
                    };
                    const userContent = pageText.startsWith("http")
                        ? `Context URL: ${pageText}\n\nQuestion: ${question}`
                        : `Page content:\n${pageText}\n\nQuestion: ${question}`;
                    const userMsg = {
                        role: "user",
                        content: userContent
                    };
                    const payload = {
                        model: "openai/gpt-oss-120b:fireworks-ai", // change model ID if needed
                        messages: [systemMsg, userMsg],
                        stream: false
                    };
                    try {
                        const resp = await axios_1.default.post("https://router.huggingface.co/v1/chat/completions", payload, {
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                "Content-Type": "application/json; charset=utf-8",
                            },
                            timeout: 45000,
                        });
                        // router typically returns choices[].message.content
                        const answer = resp?.data?.choices?.[0]?.message?.content ??
                            resp?.data?.choices?.[0]?.message ??
                            null;
                        if (!answer) {
                            panel.webview.postMessage({
                                type: "error",
                                message: `Unexpected HF response shape: ${JSON.stringify(resp?.data ?? {}, null, 2)}`,
                            });
                        }
                        else {
                            panel.webview.postMessage({ type: "answer", answer: answer.toString() });
                        }
                    }
                    catch (hfErr) {
                        const status = hfErr?.response?.status;
                        const data = hfErr?.response?.data;
                        if (status === 401 || status === 403) {
                            panel.webview.postMessage({
                                type: "error",
                                message: "Hugging Face authentication failed (401/403). Token invalid or lacks inference permission. Revoke/create a token at https://huggingface.co/settings/tokens and save it in the extension.",
                            });
                            return;
                        }
                        if (status === 404) {
                            panel.webview.postMessage({
                                type: "error",
                                message: "404 Not Found from Hugging Face router — model id may be invalid or not available for your account. Try a public model or verify the model id on huggingface.co.",
                            });
                            return;
                        }
                        if (status === 504) {
                            panel.webview.postMessage({
                                type: "error",
                                message: "504 Gateway Timeout from Hugging Face — the model or server timed out. Try again or use a smaller model / shorter input.",
                            });
                            return;
                        }
                        const errMsg = data ?? hfErr?.message ?? String(hfErr);
                        panel.webview.postMessage({
                            type: "error",
                            message: `Hugging Face call failed: ${JSON.stringify(errMsg)}`,
                        });
                    }
                    return;
                }
            }
            catch (err) {
                panel.webview.postMessage({ type: "error", message: `Extension error: ${String(err)}` });
            }
        });
        // Ensure we clean up the message listener when panel disposes
        panel.onDidDispose(() => {
            messageHandler.dispose();
        });
    });
    context.subscriptions.push(disposable);
}
function deactivate() {
    // nothing to clean up explicitly; disposables are registered in context.subscriptions
}
function getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src https: http: data:; img-src https: data:; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Webview</title>
<style>
html,body{margin:0;height:100%;font-family:Arial,Helvetica,sans-serif;}
.container{display:flex;height:100vh;}
iframe{width:70%;height:100%;border:0;}
.chat{width:30%;display:flex;flex-direction:column;border-left:1px solid #ddd;}
.controls{padding:8px;border-bottom:1px solid #eee;}
.messages{flex:1;overflow:auto;padding:8px;background:#fafafa;}
.inputRow{display:flex;padding:8px;border-top:1px solid #eee;}
.inputRow input{flex:1;padding:6px;}
.inputRow button{margin-left:6px;}
.apiKeyRow{margin-top:6px;display:flex;gap:6px;}
.apiKeyRow input{flex:1;padding:6px;}
.msg.user{color:#0b5;font-weight:600;margin-bottom:8px;}
.msg.ai{color:#025;margin-bottom:8px;}
.small{font-size:12px;color:#666;margin-bottom:6px;}
textarea#answer{width:100%;height:140px;padding:8px;box-sizing:border-box;margin-bottom:8px;}
</style>
</head>
<body>
  <div class="container">
    <iframe id="browserIframe" src="about:blank"></iframe>
    <div class="chat">
      <div class="controls">
        <input id="url" type="text" placeholder="Enter URL..." style="width:100%" />
        <div style="margin-top:6px;">
          <button id="loadBtn">Load URL</button>
        </div>
        <div class="apiKeyRow">
          <input id="apiKeyInput" type="password" placeholder="Enter HuggingFace API key" />
          <button id="saveApiBtn">Save API Key</button>
        </div>
        <div class="small">API key stored in VS Code Secret Storage. Leave empty to use mock responses.</div>
      </div>

      <div class="messages" id="messages"></div>

      <div style="padding:8px;">
        <textarea id="answer" placeholder="AI answer will appear here..." readonly></textarea>
      </div>

      <div class="inputRow">
        <input id="userInput" placeholder="Ask about the page..." />
        <button id="sendBtn">Send</button>
      </div>
    </div>
  </div>

<script>
  const vscode = acquireVsCodeApi();
  const iframe = document.getElementById('browserIframe');
  const messagesEl = document.getElementById('messages');
  const answerEl = document.getElementById('answer');
  let currentUrl = '';

  function append(msg, cls) {
    const d = document.createElement('div');
    d.className = 'msg ' + (cls || '');
    d.textContent = msg;
    messagesEl.appendChild(d);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  document.getElementById('loadBtn').addEventListener('click', () => {
    const url = document.getElementById('url').value.trim();
    if (!url) return;
    iframe.src = url;
    currentUrl = url;
    vscode.postMessage({ type: 'loadUrl', url });
    append('Loaded ' + url, 'small');
  });

  document.getElementById('saveApiBtn').addEventListener('click', () => {
    const key = (document.getElementById('apiKeyInput')).value.trim();
    if (!key) { append('API key empty', 'small'); return; }
    vscode.postMessage({ type: 'saveApiKey', apiKey: key });
    (document.getElementById('apiKeyInput')).value = '';
    append('API key sent to extension for secure storage', 'small');
  });

  document.getElementById('sendBtn').addEventListener('click', () => {
    const q = (document.getElementById('userInput')).value.trim();
    if (!q) return;
    append('You: ' + q, 'user');
    (document.getElementById('userInput')).value = '';
    vscode.postMessage({ type: 'ask', question: q, pageText: currentUrl || '' });
  });

  window.addEventListener('message', event => {
    const msg = event.data;
    switch (msg.type) {
      case 'answer':
        answerEl.value = msg.answer;
        append('AI answered', 'ai');
        break;
      case 'error':
        append('Error: ' + msg.message, 'small');
        break;
      case 'apiKeySaved':
        append('API key saved ✅', 'small');
        break;
      case 'pageContent':
        append('Page loaded: ' + msg.url, 'small');
        break;
    }
  });
</script>
</body>
</html>`;
}
//# sourceMappingURL=extension.js.map