# GEMINI // APEX

Google Gemini API와 Tavily Search MCP를 사용하는 한국어 챗봇입니다. Tavily가 실시간 웹 자료를 검색하고, Gemini가 검색 결과와 출처를 기반으로 답변합니다. 두 API 키는 모두 서버에서만 사용됩니다.

## 실행 방법

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 Gemini API 키를 발급합니다.
2. [Tavily Dashboard](https://app.tavily.com/home)에서 Tavily API 키를 발급합니다.
3. `.env.example`을 `.env`로 복사한 뒤 두 키를 입력합니다.

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY=발급받은_API_키
GEMINI_MODEL=gemini-3.6-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash
TAVILY_API_KEY=발급받은_TAVILY_API_키
PORT=3000
```

4. 패키지를 설치하고 서버를 실행합니다.

```bash
npm install
npm start
```

5. 브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 테스트

```bash
npm test
```

`LIVE WEB`를 끄면 Tavily 검색 없이 Gemini만으로 대화할 수 있습니다. Tavily 키가 없는 상태에서 실시간 검색을 사용하면 설정 안내가 표시됩니다.
