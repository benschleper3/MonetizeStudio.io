import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { runAuditor } from './agents/auditor.js';
import { runCompetitor } from './agents/competitor.js';
import { runTrends } from './agents/trends.js';
import { runIdeation } from './agents/ideation.js';
import { runScriptwriter } from './agents/scriptwriter.js';
import { formatAndSave, printSection } from './utils/outputFormatter.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DIRECTOR_SYSTEM = `You are the Content Director for a creator growth agency called MonetizeStudio. You are the world's leading expert on building online audiences that convert to buyers. You understand the full content funnel: TOF (top of funnel) content that builds awareness and grows following, MOF (middle of funnel) content that builds trust and nurtures, and BOF (bottom of funnel) content that drives purchases. You are deeply expert in Instagram and YouTube — their algorithms, content formats, what hooks stop the scroll, how to build narrative sequences across a feed, how Stories and Reels work together, how YouTube long-form feeds into short-form, and how all of it connects to a high-ticket product sale. You think like a direct-response marketer. Every content recommendation is tied to a conversion outcome. You orchestrate a team of specialist sub-agents and synthesize their work into a complete content strategy for the creator client.`;

/**
 * Build context string from accumulated agent results.
 */
function buildContext(results) {
  return results
    .filter(Boolean)
    .map((r) => `### ${r.agent}\n${r.output}`)
    .join('\n\n');
}

/**
 * Run the full orchestrated pipeline.
 */
export async function runFull({ handle, niche, product, price }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const results = [];

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         MONETIZESTUDIO CONTENT DIRECTOR                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  Client: ${handle || 'N/A'} | Niche: ${niche} | Product: ${product} ($${price})\n`);

  // Step 1: Profile Audit
  if (handle) {
    try {
      const auditorResult = await runAuditor({ handle, niche, context: '' });
      results.push(auditorResult);
      printSection('Profile Audit Complete', auditorResult.output);
    } catch (err) {
      console.error('[Director] Auditor failed:', err.message);
    }
  }

  // Step 2: Competitor Research
  try {
    const competitorResult = await runCompetitor({
      niche,
      competitors: [],
      context: buildContext(results),
    });
    results.push(competitorResult);
    printSection('Competitor Research Complete', competitorResult.output);
  } catch (err) {
    console.error('[Director] Competitor agent failed:', err.message);
  }

  // Step 3: Trend Analysis
  try {
    const trendsResult = await runTrends({
      niche,
      context: buildContext(results),
    });
    results.push(trendsResult);
    printSection('Trend Analysis Complete', trendsResult.output);
  } catch (err) {
    console.error('[Director] Trends agent failed:', err.message);
  }

  // Step 4: Content Ideation
  let ideationResult = null;
  try {
    ideationResult = await runIdeation({
      niche,
      product,
      price,
      context: buildContext(results),
    });
    results.push(ideationResult);
    printSection('Content Ideation Complete (30 Ideas)', ideationResult.output);
  } catch (err) {
    console.error('[Director] Ideation agent failed:', err.message);
  }

  // Step 5: Script Writing (top 3 ideas)
  if (ideationResult) {
    const topIdeas = extractTopIdeas(ideationResult.output);
    for (const idea of topIdeas) {
      try {
        const scriptResult = await runScriptwriter({
          idea: idea.hook,
          platform: idea.platform,
          stage: idea.stage,
          context: buildContext(results.slice(0, -1)), // context without ideation to keep lean
        });
        results.push(scriptResult);
        printSection(`Script: "${idea.hook.slice(0, 50)}..."`, scriptResult.output);
      } catch (err) {
        console.error(`[Director] Scriptwriter failed for "${idea.hook}":`, err.message);
      }
    }
  }

  // Director synthesis
  let synthesisResult = null;
  try {
    synthesisResult = await synthesize({ handle, niche, product, price, results });
    printSection('Content Director Synthesis', synthesisResult);
  } catch (err) {
    console.error('[Director] Synthesis failed:', err.message);
  }

  if (synthesisResult) {
    results.push({ agent: 'Content Director Synthesis', output: synthesisResult });
  }

  // Save outputs
  const { mdPath, jsonPath } = formatAndSave(results, { handle, niche, timestamp });
  console.log(`\n✓ Strategy saved to:`);
  console.log(`  Markdown: ${mdPath}`);
  console.log(`  JSON:     ${jsonPath}\n`);

  return { results, mdPath, jsonPath };
}

/**
 * Director-level synthesis across all agent outputs.
 */
async function synthesize({ handle, niche, product, price, results }) {
  const allOutputs = buildContext(results);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: DIRECTOR_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `You have just received reports from your specialist team for ${handle || 'the client'} in the "${niche}" niche selling "${product}" at $${price}.

Here are all their reports:

${allOutputs}

Now synthesize everything into a 90-day Content Director Action Plan. Include:
1. The 3 biggest strategic opportunities you see based on all the research
2. The recommended content cadence for the next 30 days (specific post types per week)
3. The single most important thing they should do in the next 7 days
4. A note on the #1 funnel gap and how the content plan closes it

Be direct, specific, and opinionated. You are the expert. Tell them exactly what to do.`,
      },
    ],
  });

  return response.content[0].text;
}

/**
 * Parse top 3 ideas from ideation output for scripting.
 * Extracts the first TOF, first MOF, and first BOF idea.
 */
function extractTopIdeas(ideationOutput) {
  const ideas = [];
  const sections = { TOF: null, MOF: null, BOF: null };

  // Try to parse structured ideas from the output
  const lines = ideationOutput.split('\n');
  let currentStage = null;

  for (const line of lines) {
    if (line.includes('TOF') && line.includes('#1')) currentStage = 'TOF';
    else if (line.includes('MOF') && line.includes('#1')) currentStage = 'MOF';
    else if (line.includes('BOF') && line.includes('#1')) currentStage = 'BOF';

    // Find bold hooks: **#1: Hook text**
    const hookMatch = line.match(/\*\*#(\d+):\s*(.+?)\*\*/);
    if (hookMatch) {
      const num = parseInt(hookMatch[1]);
      const hook = hookMatch[2].trim();

      // Determine stage from surrounding context
      const stageMatch = ideationOutput
        .slice(0, ideationOutput.indexOf(line))
        .match(/(TOF|MOF|BOF)[^\n]*\n/g);
      const stage = stageMatch ? stageMatch[stageMatch.length - 1].match(/TOF|MOF|BOF/)[0] : 'TOF';

      // Find platform in next few lines
      const lineIdx = lines.indexOf(line);
      const snippet = lines.slice(lineIdx, lineIdx + 8).join('\n');
      const platformMatch = snippet.match(/Platform:\s*(Instagram|YouTube)/i);
      const platform = platformMatch ? platformMatch[1] : 'Instagram';

      if (!sections[stage] && num <= 3) {
        sections[stage] = { hook, platform, stage };
      }
    }
  }

  // Fallback: pull first 3 hooks found
  if (!sections.TOF && !sections.MOF && !sections.BOF) {
    const allHooks = [...ideationOutput.matchAll(/\*\*#\d+:\s*(.+?)\*\*/g)];
    return allHooks.slice(0, 3).map((m) => ({
      hook: m[1].trim(),
      platform: 'Instagram',
      stage: 'TOF',
    }));
  }

  return Object.values(sections).filter(Boolean).slice(0, 3);
}

/**
 * Run audit only.
 */
export async function runAuditOnly({ handle, niche }) {
  const result = await runAuditor({ handle, niche });
  printSection('Profile Audit', result.output);
  const { mdPath, jsonPath } = formatAndSave([result], { handle, niche });
  console.log(`\n✓ Saved: ${mdPath}`);
  return result;
}

/**
 * Run competitor + trends.
 */
export async function runResearch({ niche, competitors }) {
  const competitorResult = await runCompetitor({ niche, competitors });
  printSection('Competitor Research', competitorResult.output);

  const trendsResult = await runTrends({
    niche,
    context: buildContext([competitorResult]),
  });
  printSection('Trend Analysis', trendsResult.output);

  const results = [competitorResult, trendsResult];
  const { mdPath, jsonPath } = formatAndSave(results, { niche });
  console.log(`\n✓ Saved: ${mdPath}`);
  return results;
}

/**
 * Run ideation only.
 */
export async function runIdeationOnly({ niche, product, price }) {
  const result = await runIdeation({ niche, product, price });
  printSection('Content Ideation (30 Ideas)', result.output);
  const { mdPath, jsonPath } = formatAndSave([result], { niche });
  console.log(`\n✓ Saved: ${mdPath}`);
  return result;
}

/**
 * Run script writer only.
 */
export async function runScriptOnly({ idea, platform, stage }) {
  const result = await runScriptwriter({ idea, platform, stage });
  printSection('Script', result.output);
  const { mdPath, jsonPath } = formatAndSave([result], { niche: 'script' });
  console.log(`\n✓ Saved: ${mdPath}`);
  return result;
}
