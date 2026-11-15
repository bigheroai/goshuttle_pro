import { supabase } from '../../lib/supabase';

/**
 * Chat completions are served by the site's own /api/ai/chat route, which
 * calls OpenAI through Netlify AI Gateway. The route is admin-only, so every
 * request carries the signed-in user's Supabase access token.
 */
const CHAT_COMPLETION_ENDPOINT = '/api/ai/chat';

async function authHeaders() {
  const { data } = (await supabase?.auth?.getSession()) || {};
  const token = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Get a chat completion (OpenAI response shape).
 *
 * @param {string} _provider - Kept for backwards compatibility; only OpenAI models are served
 * @param {string} model - Model name (falls back to gpt-4o-mini if not allowed)
 * @param {array} messages - Messages array
 * @param {object} options - Additional parameters (temperature, max_completion_tokens, ...)
 */
export async function getChatCompletion(_provider, model, messages, options = {}) {
  const response = await fetch(CHAT_COMPLETION_ENDPOINT, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ model, messages, stream: false, parameters: options }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Chat completion failed (${response.status})`);
  }
  return data;
}

/**
 * Stream a chat completion. Each chunk has the OpenAI streaming shape.
 */
export async function getStreamingChatCompletion(
  _provider,
  model,
  messages,
  onChunk,
  onComplete,
  onError,
  options = {}
) {
  try {
    const response = await fetch(CHAT_COMPLETION_ENDPOINT, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ model, messages, stream: true, parameters: options }),
    });

    if (!response?.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let data;
        try {
          data = JSON.parse(line.slice(6));
        } catch {
          continue; // Skip invalid JSON
        }
        if (data?.type === 'chunk' && data?.chunk) {
          onChunk(data.chunk);
        } else if (data?.type === 'done') {
          onComplete();
        } else if (data?.type === 'error') {
          console.error('Chat completion error:', data?.error, data?.details);
          onError(new Error(data.error));
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    onError(error);
  }
}
