
**Assignment 2 – AI Webview**

This VS Code extension creates a Webview panel that allows:

- **Left side:** an iframe to load a website from an input URL.
- **Right side:** a chatbox to ask AI questions about the website content (OpenAI GPT API).
- Users can enter an API key, saved securely in VS Code Secret Storage.
- AI answers based on the content of the loaded webpage.

---

## 1️⃣ Clone the repository

```bash
git clone https://github.com/tuongroth/test.git
cd vscode-ai-webview
````

---

## 2️⃣ Install dependencies

```bash
npm install
```

---

## 3️⃣ Run the extension in VS Code

There are two ways:

### Option A: F5 in VS Code

Open the `vscode-ai-webview` folder in VS Code.-> Press **F5** to start Extension Development Host-> A new VS Code window will open (Extension Development Host).

### Option B: Command line

```bash
code --extensionDevelopmentPath="C:\Users\HP\test\vscode-ai-webview"
```

---

## 4️⃣ Open AI Webview

1. In the Extension Development Host, press `Ctrl+Shift+P`.-> Type `AI Webview: Open` and press Enter.-> The Webview will display:

* **Left:** iframe (website)
* **Right:** chatbox + API key input + answer box

---

## 5️⃣ Using the Webview

### Load URL

* Enter the URL of the website you want to analyze in the **URL input box**.: example: https://en.wikipedia.org/wiki/OpenAI
* Click **Load URL**.
* The page text is extracted and stored for the AI.

### Save API key

* Enter your OpenAI API key (`sk-xxxx...`) in the **API Key input**. example:(create one at https://platform.openai.com/account/api-keys
).
* Click **Save API Key**.
* You should see: `API key saved ✅`.

### Ask AI

* Type your question about the loaded page in the **Ask about the page…** input. example:What information about OpenAI is mentioned on this page?
* Click **Send**.
* AI will reply and the answer will appear in the **Answer** textarea.

⚠️ Notes:

* The API key must be valid and have remaining quota.
* Do **not** commit or share your API key publicly.
* Load a URL before asking AI to ensure page data is available.

---

## 6️⃣ Example questions

* "Summarize the content of this webpage."
* "List the main headings on this page."
* "What information about OpenAI is present on this page?"

---


## 8️⃣ Notes

* The Webview supports an **iframe + chat UI** layout.
* If the Secret Storage does not contain a key, it falls back to `process.env.OPENAI_API_KEY`.
* Use **GPT-3.5-turbo** for lower throttling.

---

## 9️⃣ Optional diagram

```
+------------------------+-----------------+
|      Iframe (80%)      | Chatbox (20%)   |
|  Loads website content | API Key input   |
|                        | Question input  |
|                        | Send button     |
|                        | Answer textarea |
+------------------------+-----------------+
```

---

