import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Perform a web search using Anthropic's built-in web_search tool.
 * Returns a clean string summary of results.
 */
export async function webSearch(query) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [
      {
        role: 'user',
        content: `Search for: ${query}\n\nSummarize the key findings concisely.`,
      },
    ],
  });

  const parts = [];
  for (const block of response.content) {
    if (block.type === 'text') {
      parts.push(block.text);
    }
  }

  return parts.join('\n').trim() || `No results found for: ${query}`;
}
