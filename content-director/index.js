#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';

const program = new Command();

program
  .name('content-director')
  .description('MonetizeStudio AI Content Director — multi-agent content strategy system')
  .version('1.0.0');

// ---------- audit ----------
program
  .command('audit')
  .description('Run the Instagram Profile Auditor on a single handle')
  .requiredOption('--handle <handle>', 'Instagram handle (e.g. @username)')
  .requiredOption('--niche <niche>', 'Creator niche (e.g. "UGC coaching")')
  .action(async (opts) => {
    requireApiKey();
    const { runAuditOnly } = await import('./director.js');
    await runAuditOnly({ handle: opts.handle, niche: opts.niche });
  });

// ---------- research ----------
program
  .command('research')
  .description('Run Competitor Research + Trend Analyst')
  .requiredOption('--niche <niche>', 'Creator niche')
  .option('--competitors <handles>', 'Comma-separated competitor handles (e.g. "@handle1,@handle2")', '')
  .action(async (opts) => {
    requireApiKey();
    const { runResearch } = await import('./director.js');
    const competitors = opts.competitors
      ? opts.competitors.split(',').map((h) => h.trim()).filter(Boolean)
      : [];
    await runResearch({ niche: opts.niche, competitors });
  });

// ---------- ideate ----------
program
  .command('ideate')
  .description('Generate 30 content ideas (12 TOF, 10 MOF, 8 BOF)')
  .requiredOption('--niche <niche>', 'Creator niche')
  .requiredOption('--product <product>', 'Product name (e.g. "cohort course")')
  .requiredOption('--price <price>', 'Product price (e.g. 997)')
  .action(async (opts) => {
    requireApiKey();
    const { runIdeationOnly } = await import('./director.js');
    await runIdeationOnly({ niche: opts.niche, product: opts.product, price: opts.price });
  });

// ---------- script ----------
program
  .command('script')
  .description('Write a video script for a single content idea')
  .requiredOption('--idea <idea>', 'Content idea or hook')
  .requiredOption('--platform <platform>', 'Platform: instagram or youtube')
  .requiredOption('--stage <stage>', 'Funnel stage: TOF, MOF, or BOF')
  .action(async (opts) => {
    requireApiKey();
    const { runScriptOnly } = await import('./director.js');
    const platform = opts.platform.toLowerCase() === 'youtube' ? 'YouTube' : 'Instagram';
    const stage = opts.stage.toUpperCase();
    if (!['TOF', 'MOF', 'BOF'].includes(stage)) {
      console.error('[Error] --stage must be TOF, MOF, or BOF');
      process.exit(1);
    }
    await runScriptOnly({ idea: opts.idea, platform, stage });
  });

// ---------- full ----------
program
  .command('full')
  .description('Run ALL agents end-to-end and produce a complete content strategy')
  .requiredOption('--handle <handle>', 'Instagram handle (e.g. @username)')
  .requiredOption('--niche <niche>', 'Creator niche')
  .requiredOption('--product <product>', 'Product name')
  .requiredOption('--price <price>', 'Product price')
  .action(async (opts) => {
    requireApiKey();
    const { runFull } = await import('./director.js');
    await runFull({ handle: opts.handle, niche: opts.niche, product: opts.product, price: opts.price });
  });

// Show help if no command given
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

function requireApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n[ERROR] ANTHROPIC_API_KEY is not set. Add it to your .env file.\n');
    process.exit(1);
  }
}

try {
  await program.parseAsync(process.argv);
} catch (err) {
  console.error('[Error]', err.message);
  process.exit(1);
}
