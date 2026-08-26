import test from "node:test";
import assert from "node:assert/strict";
import {
  extractText,
  generateWithGemini,
  normalizeMessages,
  parseSearchSources,
} from "../server.mjs";

test("normalizeMessages keeps valid recent messages", () => {
  const messages = normalizeMessages([
    { role: "user", text: "  안녕  " },
    { role: "assistant", text: "무시" },
    { role: "model", text: "반가워요" },
  ]);

  assert.deepEqual(messages, [
    { role: "user", parts: [{ text: "안녕" }] },
    { role: "model", parts: [{ text: "반가워요" }] },
  ]);
});

test("extractText joins Gemini response parts", () => {
  const text = extractText({
    candidates: [{ content: { parts: [{ text: "안녕" }, { text: "하세요" }] } }],
  });

  assert.equal(text, "안녕하세요");
});

test("parseSearchSources extracts Tavily titles and URLs", () => {
  const sources = parseSearchSources([
    "Detailed Results:",
    "Title: 첫 번째 소식",
    "URL: https://example.com/one",
    "Content: 최신 내용",
    "",
    "Title: 두 번째 소식",
    "URL: https://example.com/two",
    "Content: 다른 내용",
  ].join("\n"));

  assert.deepEqual(sources, [
    { title: "첫 번째 소식", url: "https://example.com/one" },
    { title: "두 번째 소식", url: "https://example.com/two" },
  ]);
});

test("parseSearchSources supports remote Tavily MCP JSON", () => {
  const sources = parseSearchSources(JSON.stringify({
    results: [
      { title: "최신 뉴스", url: "https://example.com/news", content: "내용" },
    ],
  }));

  assert.deepEqual(sources, [
    { title: "최신 뉴스", url: "https://example.com/news" },
  ]);
});

test("generateWithGemini retries demand errors and uses the fallback model", async () => {
  const calls = [];
  const statuses = [503, 503, 200];

  const outcome = await generateWithGemini({
    apiKey: "test-key",
    models: ["gemini-3.6-flash", "gemini-3.5-flash"],
    payload: { contents: [] },
    fetchFn: async (url) => {
      calls.push(url);
      const status = statuses.shift();
      const body = status === 200
        ? { candidates: [{ content: { parts: [{ text: "성공" }] } }] }
        : { error: { message: "high demand" } };
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
    waitFn: async () => {},
  });

  assert.equal(outcome.model, "gemini-3.5-flash");
  assert.equal(calls.filter((url) => url.includes("gemini-3.6-flash")).length, 2);
  assert.equal(calls.filter((url) => url.includes("gemini-3.5-flash")).length, 1);
});

test("generateWithGemini does not retry authentication errors", async () => {
  let calls = 0;

  await assert.rejects(
    generateWithGemini({
      apiKey: "bad-key",
      models: ["primary", "fallback"],
      payload: { contents: [] },
      fetchFn: async () => {
        calls += 1;
        return new Response(JSON.stringify({ error: { message: "invalid key" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      },
      waitFn: async () => {},
    }),
    /invalid key/,
  );

  assert.equal(calls, 1);
});
