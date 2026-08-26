export function GET() {
  return Response.json({
    webSearchConfigured: Boolean(process.env.TAVILY_API_KEY),
  });
}
