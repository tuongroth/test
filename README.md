**ASSIGNMENT 1 –  VSCode Extension Life Cycle & Auto-Suggestion Demo**

## Key Points

* Activation is triggered by user action → `activate()` runs
* Auto-suggestions are provided via registered providers
* This Hello/Goodbye example illustrates both life cycle and IntelliSense

## Life Cycle

* **Activation:** Activation: An extension only loads when one of its declared activationEvents fires.
Example in package.json:

"activationEvents": [
  "onCommand:extension.helloWorld"
]


This means the extension activates when the user runs the Hello World command.


  **Demo:** Press `Ctrl+Shift+P → Hello World` → Popup appears  
  ![Hello World Command Trigger](https://github.com/tuongroth/screenshot/blob/main/assets/553073624_649976174573743_1105425583170252892_n.png)
  ![Popup Display](https://github.com/tuongroth/screenshot/blob/main/assets/553217333_782106247781651_5930813630517325974_n.png)

* **Running:** `activate()` registers commands and providers.

* **Deactivation:** `deactivate()` cleans up resources when the extension is disabled or VSCode closes.

## Auto-Suggestion / IntelliSense

* VSCode calls **CompletionItemProvider**Basic Demo:
Using languages.registerCompletionItemProvider, an extension can register suggestions.
When a user types, VS Code calls the provider → it returns a list of CompletionItem[].

  **Demo:** Open `test.txt`, type `.` → suggestions `HelloWorld / Goodbye` appear  
  ![Auto-Suggestion Example](https://github.com/tuongroth/screenshot/blob/main/assets/553590479_1071886631801148_3727056619677516986_n.png)






---------------------------------------------------------------------------------------------




**ASSIGNMENT 2 – AI Webview**

## Screenshots


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

* Enter your OpenAI API key (`sk-xxxx...`) in the **API Key input**. example: https://huggingface.co/settings/tokens
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
**AI Webview – Loading a Website & Chatbox Layout**  
![AI Webview Example 1](https://github.com/tuongroth/screenshot/blob/main/assets/553403895_697595876703086_1153140202464501344_n.png)

**AI Webview – Asking AI about the Website**  
![AI Webview Example 2](https://github.com/tuongroth/screenshot/blob/main/assets/553414570_1301683024502487_6089137219557561561_n.png)

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
source: https://huggingface.co/docs/inference-providers/tasks/chat-completion
---
