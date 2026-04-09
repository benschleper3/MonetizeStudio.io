import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a content strategist who creates conversion-focused content plans for creators selling digital products. You generate content ideas across the full funnel:

TOF (top of funnel) — content designed to reach new people, grow following, go viral or reach non-followers. These are broad, relatable, high-value or entertaining. They do not pitch.

MOF (middle of funnel) — content designed to build trust, demonstrate expertise, and move followers closer to buying. These show the creator's framework, results, story, and methodology.

BOF (bottom of funnel) — content designed to convert warm followers into buyers. These address objections, show social proof, explain the offer, and create urgency.

For each idea you generate, output:
- Title/hook
- Platform (Instagram or YouTube)
- Format (Reel, carousel, long-form, Short, Story)
- Funnel Stage (TOF/MOF/BOF)
- Conversion Intent (what belief shift this creates in the viewer)
- Estimated effort (low/medium/high)

Always generate ideas in batches of 30: 12 TOF, 10 MOF, 8 BOF.`;

export async function runIdeation({ niche, product, price, context = '' }) {
  const userMessage = `
Generate 30 content ideas for a creator in the "${niche}" niche selling "${product}" at $${price}.

${context ? `## Research Context (Competitor & Trend Data)\n${context}` : ''}

Generate exactly 30 ideas: 12 TOF, 10 MOF, 8 BOF. Number them within each section. Make the hooks specific, punchy, and scroll-stopping. Each idea should clearly serve the overall goal of selling "${product}" at $${price} — even the TOF content should build the audience most likely to buy that offer.

Format each idea as:
**#X: [Hook/Title]**
- Platform:
- Format:
- Stage:
- Conversion Intent:
- Effort:
`.trim();

  console.log('[Ideation] Generating 30 content ideas...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const result = response.content[0].text;
  return { agent: 'Content Ideation', niche, product, price, output: result };
}
