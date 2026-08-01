/**
 * Thin wrapper around the Groq chat completions API (OpenAI-compatible schema).
 * Docs: https://console.groq.com/docs/quickstart
 *
 * Uses global fetch (Node 18+). Requires GROQ_API_KEY in .env.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

async function groqChat({ systemPrompt, messages, temperature = 0.4, maxTokens = 700, jsonMode = false }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured on the server. Add it to backend/.env');
  }

  const body = {
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Builds a compact, factual business-context string to ground the LLM's answers.
 * Keeping this numeric/summarized (not raw table dumps) keeps token usage sane
 * and reduces the chance of the model inventing figures.
 */
function buildBusinessContextPrompt(context) {
  return `You are an AI business assistant embedded in an MSME/retail ERP tool for the business "${context.businessName}".
Answer ONLY using the structured business data provided below — do not invent numbers.
If the data doesn't cover the question, say so plainly and suggest what data would help.
Keep answers concise, practical, and in plain business language (avoid jargon). Use ₹ for currency.
When asked for a recommendation, ground it in the actual figures given.

BUSINESS SNAPSHOT (JSON):
${JSON.stringify(context, null, 2)}`;
}

module.exports = { groqChat, buildBusinessContextPrompt };
