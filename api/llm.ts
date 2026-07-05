export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    return new Response('Server not configured — admin must set OPENROUTER_KEY', { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { messages, model } = body;
  if (!messages) {
    return new Response('Missing "messages" in request body', { status: 400 });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': req.headers.get('origin') || 'https://tram.kimi',
      'X-Title': 'EASA Pilot Essentials',
    },
    body: JSON.stringify({
      model: model || 'openrouter/free',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
