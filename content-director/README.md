# MonetizeStudio Content Director

A multi-agent AI content strategy system built with the Anthropic API. Orchestrates specialized Claude sub-agents to produce complete content strategies for creator businesses.

## Setup

```bash
cd content-director
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY (required) and APIFY_API_KEY (optional) to .env
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `APIFY_API_KEY` | No | Apify key for real Instagram data (falls back to mock data if not set) |
| `NOTION_API_KEY` | No | Notion integration (scaffolded, not yet implemented) |

## Commands

### Audit — Profile Auditor only
```bash
node index.js audit --handle @username --niche "UGC coaching"
```
Scores the Instagram profile across 10 dimensions and outputs a ranked improvement list.

### Research — Competitor + Trend Analysis
```bash
node index.js research --niche "UGC coaching" --competitors "@handle1,@handle2"
```
Maps the competitive landscape and classifies current content trends (Early/Peak/Saturated).

### Ideate — 30 Content Ideas
```bash
node index.js ideate --niche "UGC coaching" --product "cohort course" --price 997
```
Generates 30 content ideas: 12 TOF, 10 MOF, 8 BOF — each with hook, platform, format, stage, and conversion intent.

### Script — Single Video Script
```bash
node index.js script --idea "How I landed my first UGC brand deal" --platform instagram --stage TOF
```
Writes a full production-ready script with 3 hook options, open loop, body with pattern interrupts, stage-matched CTA, and platform notes.

### Full — Complete Strategy (All Agents)
```bash
node index.js full --handle @username --niche "UGC coaching" --product "cohort course" --price 997
```
Runs all 5 agents in sequence. Each agent receives prior agents' outputs as context. Produces:
- Profile audit
- Competitive landscape map
- Trend analysis
- 30 content ideas
- 3 full video scripts (one TOF, one MOF, one BOF)
- Content Director synthesis with a 90-day action plan

## Agent Pipeline (Full Command)

```
Profile Auditor
      ↓
Competitor Research Agent
      ↓
Trend Analyst
      ↓
Content Ideation Agent  ← receives competitor + trend data
      ↓
Script Writer (×3)      ← writes top TOF, MOF, BOF scripts
      ↓
Content Director        ← synthesizes everything into 90-day plan
```

## Output

All outputs are saved to `outputs/` as both `.md` (human-readable) and `.json` (programmatic):

```
outputs/
  username_2025-03-01T12-00-00.md
  username_2025-03-01T12-00-00.json
```

## Agents

| Agent | File | Purpose |
|---|---|---|
| Profile Auditor | `agents/auditor.js` | 10-dimension Instagram audit |
| Competitor Research | `agents/competitor.js` | Competitive landscape mapping |
| Trend Analyst | `agents/trends.js` | Current trends with Early/Peak/Saturated classification |
| Content Ideation | `agents/ideation.js` | 30 ideas across TOF/MOF/BOF |
| Script Writer | `agents/scriptwriter.js` | Full production scripts |
| Content Director | `director.js` | Orchestration + 90-day synthesis |

## Tools

| Tool | File | Description |
|---|---|---|
| Web Search | `tools/webSearch.js` | Anthropic built-in `web_search_20250305` |
| Instagram Scraper | `tools/instagramScraper.js` | Apify `instagram-profile-scraper` with mock fallback |

## Stack

- Node.js (ESM modules, requires Node 18+)
- `@anthropic-ai/sdk` — Claude API
- `commander` — CLI parsing
- `dotenv` — environment variables
- `node-fetch` — HTTP for Apify
