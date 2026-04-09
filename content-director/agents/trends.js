import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a content trend analyst specializing in Instagram Reels and YouTube for creator businesses. You identify:

(1) Audio trends — which sounds are trending and early enough to still have reach potential
(2) Format trends — what video styles, transitions, or structures are performing well right now (talking head, POV, day-in-the-life, listicle, mini-documentary, etc.)
(3) Hook trends — what types of opening lines or visual hooks are stopping the scroll right now
(4) Topic trends — what subjects are getting disproportionate engagement in the creator/business niche right now
(5) Platform-specific signals — what is the Instagram algorithm rewarding vs suppressing right now, same for YouTube

Classify each trend as:
- Early (high opportunity — jump on this now)
- Peak (still worth testing — strong but getting competitive)
- Saturated (avoid — oversaturated, diminishing returns)

Use web search to find current information. Always note your search date so the user knows how fresh the data is.`;

export async function runTrends({ niche, context = '' }) {
  const userMessage = `
Analyze current content trends for the "${niche}" niche on Instagram and YouTube.

Search date: ${new Date().toISOString().split('T')[0]}

${context ? `## Context from Previous Research\n${context}` : ''}

Cover all 5 trend categories. For each trend, note: what it is, classification (Early/Peak/Saturated), why it's performing, and a specific actionable recommendation for a creator in the "${niche}" space. End with a "Top 5 Trends to Act on NOW" priority list.
`.trim();

  console.log('[Trends] Analyzing current content trends...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: userMessage }],
  });

  // Handle tool use loop
  const messages = [{ role: 'user', content: userMessage }];
  let finalResponse = response;

  while (finalResponse.stop_reason === 'tool_use') {
    const toolUseBlocks = finalResponse.content.filter((b) => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: finalResponse.content });

    const toolResults = toolUseBlocks.map((toolUse) => ({
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: '',
    }));

    messages.push({ role: 'user', content: toolResults });

    finalResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });
  }

  const textBlocks = finalResponse.content.filter((b) => b.type === 'text');
  const result = textBlocks.map((b) => b.text).join('\n');

  return { agent: 'Trend Analyst', niche, output: result };
}
