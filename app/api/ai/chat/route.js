import OpenAI from 'openai';
import { getRequestAuth, json } from '@/server/auth';

export const dynamic = 'force-dynamic';

// Netlify AI Gateway injects the OpenAI credentials at runtime (not at build
// time), so the client is created lazily on the first request.
let client;
const getOpenAI = () => (client ??= new OpenAI());

const DEFAULT_MODEL = 'gpt-4o-mini';
// Only models available through Netlify AI Gateway, kept small so the route
// can't be used to run up costs on expensive models.
const ALLOWED_MODELS = new Set(['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.4-mini', 'gpt-5.4-nano']);
const MAX_MESSAGES = 50;
const MAX_TOKENS = 2000;
const ROLES = new Set(['system', 'user', 'assistant']);

function pickParameters(params = {}, model) {
  const out = {};
  // GPT-5 family models only accept the default sampling settings.
  const fixedSampling = model.startsWith('gpt-5');
  if (!fixedSampling && Number.isFinite(params.temperature)) out.temperature = Math.min(Math.max(params.temperature, 0), 2);
  if (!fixedSampling && Number.isFinite(params.top_p)) out.top_p = Math.min(Math.max(params.top_p, 0), 1);
  const maxTokens = Number(params.max_completion_tokens ?? params.max_tokens);
  out.max_completion_tokens = Number.isFinite(maxTokens) && maxTokens > 0 ? Math.min(maxTokens, MAX_TOKENS) : MAX_TOKENS;
  if (params.response_format?.type === 'json_object' || params.response_format?.type === 'text') {
    out.response_format = { type: params.response_format.type };
  }
  return out;
}

const sse = (data) => `data: ${JSON.stringify(data)}\n\n`;

/**
 * Admin-only chat completion via Netlify AI Gateway (OpenAI-compatible).
 * Replaces the former AWS Lambda endpoint and keeps its request/response shape.
 * Body: { messages, model?, stream?, parameters? }
 * - stream=false → OpenAI chat completion JSON
 * - stream=true  → SSE events: {type:'start'|'chunk'|'done'|'error', ...}
 */
export async function POST(request) {
  const auth = await getRequestAuth(request);
  if (!auth) return json({ error: 'Not authenticated' }, 401);
  if (!auth.isAdmin) return json({ error: 'Admin access required' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request: JSON parsing failed' }, 400);
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (
    messages.length === 0 ||
    messages.length > MAX_MESSAGES ||
    !messages.every((m) => ROLES.has(m?.role) && typeof m?.content === 'string')
  ) {
    return json({ error: `Invalid request: messages must be 1-${MAX_MESSAGES} {role, content} objects` }, 400);
  }

  const model = ALLOWED_MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;
  const params = { model, messages: messages.map(({ role, content }) => ({ role, content })), ...pickParameters(body?.parameters, model) };

  if (body?.stream !== true && body?.stream !== 'true') {
    try {
      const completion = await getOpenAI().chat.completions.create(params);
      return json(completion);
    } catch (error) {
      return json({ error: `AI request failed: ${error?.status || 500}`, details: error?.message }, 502);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => controller.enqueue(encoder.encode(sse(data)));
      send({ type: 'start', model, timestamp: new Date().toISOString() });
      try {
        const completion = await getOpenAI().chat.completions.create({ ...params, stream: true }, { signal: request.signal });
        for await (const chunk of completion) send({ type: 'chunk', chunk });
        send({ type: 'done', timestamp: new Date().toISOString() });
      } catch (error) {
        send({ type: 'error', error: `AI request failed: ${error?.status || 500}`, details: error?.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
