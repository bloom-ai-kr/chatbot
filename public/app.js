const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const messagesElement = document.querySelector("#messages");
const messageTemplate = document.querySelector("#message-template");
const resetButton = document.querySelector("#reset-button");
const suggestions = document.querySelector("#suggestions");
const searchToggle = document.querySelector("#search-toggle");
const searchLabel = document.querySelector("#search-label");

const conversation = [];
let isSending = false;
let webSearchEnabled = true;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatInline(text) {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(rawText) {
  const escaped = escapeHtml(rawText);
  const codeBlocks = [];
  const withoutCode = escaped.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_, code) => {
    const token = `%%CODE_${codeBlocks.length}%%`;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return token;
  });

  const blocks = withoutCode.split(/\n{2,}/).map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (/^%%CODE_\d+%%$/.test(trimmed)) return trimmed;

    const lines = trimmed.split("\n");
    if (lines.every((line) => /^[-*] /.test(line))) {
      return `<ul>${lines.map((line) => `<li>${formatInline(line.slice(2))}</li>`).join("")}</ul>`;
    }
    if (lines.every((line) => /^\d+\. /.test(line))) {
      return `<ol>${lines.map((line) => `<li>${formatInline(line.replace(/^\d+\. /, ""))}</li>`).join("")}</ol>`;
    }
    return `<p>${formatInline(lines.join("<br>"))}</p>`;
  });

  return blocks.join("").replace(/%%CODE_(\d+)%%/g, (_, index) => codeBlocks[Number(index)]);
}

function createMessage(role, text, options = {}) {
  const fragment = messageTemplate.content.cloneNode(true);
  const article = fragment.querySelector(".message");
  const avatar = fragment.querySelector(".avatar");
  const author = fragment.querySelector(".author");
  const content = fragment.querySelector(".message-content");
  const isUser = role === "user";

  article.classList.add(isUser ? "user-message" : "assistant-message");
  if (options.error) article.classList.add("error-message");
  if (options.id) article.id = options.id;
  avatar.textContent = isUser ? "Y" : "G";
  author.textContent = isUser ? "YOU" : "GEMINI";

  if (options.typing) {
    content.innerHTML = '<div class="typing" aria-label="Gemini가 답변을 작성 중입니다"><span></span><span></span><span></span></div>';
  } else if (isUser) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    content.append(paragraph);
  } else {
    content.innerHTML = renderMarkdown(text);
  }

  if (options.sources?.length) {
    const sources = document.createElement("div");
    sources.className = "message-sources";
    const label = document.createElement("span");
    label.textContent = `WEB SOURCES / ${options.sources.length}`;
    sources.append(label);

    const links = document.createElement("div");
    links.className = "source-links";
    for (const [index, source] of options.sources.entries()) {
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = `${String(index + 1).padStart(2, "0")} ${source.title}`;
      links.append(link);
    }
    sources.append(links);
    content.append(sources);
  }

  messagesElement.append(fragment);
  messagesElement.scrollTo({ top: messagesElement.scrollHeight, behavior: "smooth" });
}

function resizeInput() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 136)}px`;
}

function setSending(sending) {
  isSending = sending;
  input.disabled = sending;
  sendButton.disabled = sending;
  searchToggle.disabled = sending;
}

function updateSearchToggle() {
  searchToggle.classList.toggle("is-active", webSearchEnabled);
  searchToggle.setAttribute("aria-pressed", String(webSearchEnabled));
  searchLabel.textContent = webSearchEnabled ? "LIVE WEB" : "WEB OFF";
}

async function sendMessage(text) {
  const cleanText = text.trim();
  if (!cleanText || isSending) return;

  conversation.push({ role: "user", text: cleanText });
  createMessage("user", cleanText);
  input.value = "";
  resizeInput();
  setSending(true);
  createMessage("model", "", { typing: true, id: "typing-message" });

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation, webSearch: webSearchEnabled }),
    });
    const result = await response.json();
    document.querySelector("#typing-message")?.remove();

    if (!response.ok) throw new Error(result.error || "답변을 불러오지 못했습니다.");

    conversation.push({ role: "model", text: result.text });
    createMessage("model", result.text, { sources: result.sources });
  } catch (error) {
    document.querySelector("#typing-message")?.remove();
    createMessage("model", error.message, { error: true });
  } finally {
    setSending(false);
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", resizeInput);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

suggestions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-prompt]");
  if (button) sendMessage(button.dataset.prompt);
});

resetButton.addEventListener("click", () => {
  conversation.length = 0;
  messagesElement.querySelectorAll(".message:not(:first-child)").forEach((message) => message.remove());
  input.value = "";
  resizeInput();
  input.focus();
});

searchToggle.addEventListener("click", () => {
  webSearchEnabled = !webSearchEnabled;
  updateSearchToggle();
});

fetch("/api/status")
  .then((response) => response.json())
  .then((status) => {
    if (!status.webSearchConfigured) {
      searchToggle.classList.add("needs-key");
      searchToggle.title = "TAVILY_API_KEY 설정이 필요합니다.";
    }
  })
  .catch(() => {});
