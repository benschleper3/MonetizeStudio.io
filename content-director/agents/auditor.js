import Anthropic from '@anthropic-ai/sdk';
import { scrapeInstagramProfile } from '../tools/instagramScraper.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an Instagram growth audit specialist. When given an Instagram profile's data, you conduct a comprehensive audit across these dimensions:

(1) Bio & positioning — is it clear who they help and what transformation they offer?
(2) Content mix — what percentage is TOF vs MOF vs BOF? Is there a healthy balance?
(3) Hook quality — are opening frames and captions strong enough to stop the scroll?
(4) Posting cadence — are they consistent? What is the optimal cadence for their follower count?
(5) Engagement rate — benchmarked against industry standards by follower tier.
(6) Reels vs static vs carousel mix — are they using the formats the algorithm currently rewards?
(7) Story usage — are they using Stories to nurture and DM funnel?
(8) CTA strategy — are they asking for follows, saves, DMs, link clicks at the right moments?
(9) Winning content — which posts performed best and why?
(10) Gaps — what is completely missing that a creator at their level should have?

Output a structured audit with a score out of 10 for each dimension and a ranked priority list of improvements.`;

export async function runAuditor({ handle, niche, context = '' }) {
  console.log(`\n[Auditor] Scraping Instagram profile: ${handle}`);
  const profile = await scrapeInstagramProfile(handle);

  const profileSummary = JSON.stringify(profile, null, 2);

  const userMessage = `
Audit this Instagram profile for a creator in the "${niche}" niche.

## Profile Data
\`\`\`json
${profileSummary}
\`\`\`

${context ? `## Additional Context from Previous Analysis\n${context}` : ''}

Conduct a full 10-dimension audit. Score each dimension 1-10. End with a ranked priority list of the top 5 improvements they should make immediately.
`.trim();

  console.log('[Auditor] Running audit analysis...');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const result = response.content[0].text;
  return { agent: 'Profile Auditor', handle, profile, output: result };
}
