import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a video script writer for creator businesses on Instagram and YouTube. You write scripts that are punchy, conversational, and built for retention.

For every script you write:
(1) Hook (first 3 seconds) — must be an unfinished loop, a bold claim, a counterintuitive statement, or a direct call-out of the target viewer. This is the most important part. Write 3 hook options.
(2) Open loop — a sentence that makes the viewer commit to watching the full video.
(3) Body — structured in short punchy sections. No fluff. Each point must earn its place. Use pattern interrupts every 20-30 seconds.
(4) CTA — specific, single action. Match the CTA to the funnel stage: TOF = follow or save, MOF = comment or DM, BOF = link in bio or DM the word [keyword].
(5) Platform notes — for Instagram Reels: note pacing, optimal length, caption hook. For YouTube: note chapter structure, thumbnail concept, title options.

Always ask: what does the viewer feel, believe, or do differently after watching this?`;

export async function runScriptwriter({ idea, platform, stage, context = '' }) {
  const userMessage = `
Write a complete video script for the following:

**Content Idea:** ${idea}
**Platform:** ${platform}
**Funnel Stage:** ${stage}

${context ? `## Context from Content Strategy\n${context}` : ''}

Write the full script following the 5-part framework. For hooks, give all 3 options and mark which you recommend most. For the body, write the actual words — not bullet points describing what to say, but the actual dialogue/narration. Include [B-ROLL: description] and [TRANSITION] notes where relevant. End with platform-specific production notes.
`.trim();

  console.log(`[Scriptwriter] Writing script for: "${idea.slice(0, 60)}..."`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const result = response.content[0].text;
  return { agent: 'Script Writer', idea, platform, stage, output: result };
}
