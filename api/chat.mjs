import { processChat } from "../server.mjs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청 내용을 읽을 수 없습니다." }, { status: 400 });
  }

  const result = await processChat(body);
  return Response.json(result.payload, { status: result.status });
}

export function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
