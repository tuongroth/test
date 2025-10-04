import * as vscode from "vscode";
import axios from "axios";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("aiWebview.open", async () => {
    const panel = vscode.window.createWebviewPanel(
      "aiWebview",
      "AI Webview",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

    panel.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.type) {
          case "saveApiKey": {
            await context.secrets.store("ai_api_key", message.apiKey);
            panel.webview.postMessage({ type: "apiKeySaved" });
            break;
          }

          case "loadUrl": {
            const url = message.url;
            try {
              const resp = await axios.get(url, { timeout: 10000, responseType: "text" });
              const html = resp.data as string;
              const textOnly = extractText(html, 10000);
              panel.webview.postMessage({ type: "pageContent", url, text: textOnly });
            } catch (err: any) {
              panel.webview.postMessage({
                type: "error",
                message: `Failed to fetch URL: ${err?.message ?? String(err)}`,
              });
            }
            break;
          }

          case "ask": {
            const question = message.question as string;
            let apiKey = await context.secrets.get("ai_api_key");
            if (!apiKey) apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
              panel.webview.postMessage({
                type: "error",
                message: "API key not set. Use the API key input to save one.",
              });
              return;
            }

            const pageText = message.pageText ?? "";

            const payload = {
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful assistant that answers questions about the provided webpage content.",
                },
                { role: "user", content: `Page content:\n${pageText}\n\nQuestion: ${question}` },
              ],
              max_tokens: 512,
            };

            const maxRetries = 3;
            let attempt = 0;
            while (attempt <= maxRetries) {
              try {
                const openaiResp = await axios.post(
                  "https://api.openai.com/v1/chat/completions",
                  payload,
                  {
                    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    timeout: 20000,
                  }
                );
                const answer = openaiResp.data?.choices?.[0]?.message?.content ?? "";
                panel.webview.postMessage({ type: "answer", answer });
                break;
              } catch (err: any) {
                const status = err?.response?.status;
                if ((status === 429 || status === 503) && attempt < maxRetries) {
                  const backoff = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s
                  await new Promise((r) => setTimeout(r, backoff));
                  attempt++;
                } else {
                  panel.webview.postMessage({
                    type: "error",
                    message: `LLM call failed: ${status ?? ""} ${err?.response?.data?.error?.message ?? err?.message}`,
                  });
                  break;
                }
              }
            }
            break;
          }
        }
      } catch (outerErr: any) {
        panel.webview.postMessage({
          type: "error",
          message: `Internal error: ${outerErr?.message ?? String(outerErr)}`,
        });
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

// Nonce generator
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

// Simple text extractor
function extractText(html: string, maxLen: number) {
  try {
    const noScript = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    const noStyle = noScript.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    const text = noStyle.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
  } catch {
    return "";
  }
}

// Webview HTML
function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src https: http: data:; img-src https: data:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Webview</title>
<style>
html,body { height:100%; margin:0; font-family: Arial, Helvetica, sans-serif; }
.container { display:flex; height:100vh; }
iframe { width:80%; height:100%; border:0; }
.chat { width:20%; border-left:1px solid #ddd; display:flex; flex-direction:column; }
.controls { padding:8px; border-bottom:1px solid #eee; }
.messages { flex:1; overflow:auto; padding:8px; background:#fafafa; }
.inputRow { display:flex; padding:8px; border-top:1px solid #eee; }
.inputRow input { flex:1; padding:6px; }
.inputRow button { margin-left:6px; }
.msg.user { color:#0b5; font-weight:600; margin-bottom:8px; }
.msg.ai { color:#025; margin-bottom:8px; }
.small { font-size:12px; color:#666; }
textarea#answer { width:100%; height:120px; padding:8px; box-sizing:border-box; margin-bottom:8px; }
.apiKeyRow { margin-top:6px; display:flex; gap:6px; }
.apiKeyRow input { flex:1; padding:6px; }
</style>
</head>
<body>
  <div class="container">
    <iframe id="browserIframe" src="about:blank"></iframe>
    <div class="chat">
      <div class="controls">
        <input id="url" type="text" placeholder="https://example.com" style="width:100%" />
        <div style="margin-top:6px;">
          <button id="loadBtn">Load URL</button>
        </div>
        <div class="apiKeyRow">
          <input id="apiKeyInput" type="password" placeholder="Enter API key (sk-...)" />
          <button id="saveApiBtn">Save API Key</button>
        </div>
        <div class="small" style="margin-top:6px;">API key is stored in VS Code Secret Storage.</div>
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

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const messagesEl = document.getElementById('messages');
  const iframe = document.getElementById('browserIframe');
  const answerEl = document.getElementById('answer');
  const apiKeyInput = document.getElementById('apiKeyInput');
  let lastPageText = '';
  const sendBtn = document.getElementById('sendBtn');

  function append(msg, cls) {
    const d = document.createElement('div');
    d.className = 'msg ' + cls;
    d.textContent = msg;
    messagesEl.appendChild(d);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  document.getElementById('loadBtn').addEventListener('click', () => {
    const url = document.getElementById('url').value.trim();
    if (!url) return;
    vscode.postMessage({ type: 'loadUrl', url });
    iframe.src = url;
    append('Loading ' + url, 'small');
  });

  document.getElementById('saveApiBtn').addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) { append('API key empty', 'small'); return; }
    vscode.postMessage({ type: 'saveApiKey', apiKey: key });
    apiKeyInput.value = '';
    append('API key sent to extension for secure storage', 'small');
  });

  sendBtn.addEventListener('click', () => {
    const q = document.getElementById('userInput').value.trim();
    if (!q) return;
    sendBtn.disabled = true;
    append('You: ' + q, 'user');
    document.getElementById('userInput').value = '';
    vscode.postMessage({ type: 'ask', question: q, pageText: lastPageText });
  });

  window.addEventListener('message', event => {
    const msg = event.data;
    switch(msg.type){
      case 'pageContent':
        append('Page loaded: ' + msg.url, 'small');
        lastPageText = msg.text ?? '';
        break;
      case 'answer':
        answerEl.value = msg.answer;
        append('AI answered', 'ai');
        sendBtn.disabled = false;
        break;
      case 'error':
        append('Error: ' + msg.message, 'small');
        sendBtn.disabled = false;
        break;
      case 'apiKeySaved':
        append('API key saved ✅', 'small');
        break;
    }
  });
</script>
</body>
</html>`;
}
