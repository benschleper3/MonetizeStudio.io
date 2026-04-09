import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a competitive intelligence specialist for creator businesses on Instagram and YouTube. When given a niche, you research the top performing creators in that space and map:

(1) Their content formats — what types of posts/videos they publish most
(2) Their funnel content — which content is clearly TOF, MOF, or BOF
(3) Their hook patterns — what types of opening lines or frames they use repeatedly
(4) Their posting cadence and frequency
(5) Their engagement rates and which content gets the most saves/comments/shares vs likes
(6) Their offer and how they transition from content to sale
(7) Content gaps — what is nobody in this niche doing that represents an opportunity?

You use web search to find this information. Output a structured competitive landscape map.`;

export async function runCompetitor({ niche, competitors = [], context = '' }) {
  const competitorList = competitors.length > 0
    ? `Focus on these specific competitors: ${competitors.join(', ')}`
    : `Identify the top 5-7 creators in this niche from your research.`;

  const userMessage = `
Research the competitive landscape for creators in the "${niche}" niche on Instagram and YouTube.

${competitorList}

${context ? `## Additional Context\n${context}` : ''}

For each competitor, map all 7 dimensions. Then identify the top 3 content gaps — opportunities no one is fully exploiting yet. Structure your output clearly with a competitor-by-competitor breakdown followed by a synthesis section.
`.trim();

  console.log('[Competitor] Running competitive research...');

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

    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: toolUse.type === 'web_search_20250305' ? '' : '',
      });
    }

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

  return { agent: 'Competitor Research', niche, competitors, output: result };
}
