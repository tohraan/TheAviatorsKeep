# AGENTS.md — SkyFrame CRM
> Master directive file. Read by Antigravity, Cursor, Claude Code.
> All agents working on this project must read this file first.

---

## 1. Project Identity

**Project:** SkyFrame CRM — internal business tool for aviation shadow box frame business.
**Stack:** React 18 + TypeScript + Tailwind + Supabase + Anthropic API.
**Operator:** Single user. Dubai, UAE. AED currency.
**Goal:** Efficient lead management, order tracking, and AI-powered content strategy.

Read `CONTEXT.md` for full business logic before any task.

---

## 2. Coding Agent Rules

### Always
- TypeScript strict mode. No `any` types.
- All DB interactions via `src/lib/supabase.ts` client — never raw fetch to Supabase.
- All amounts in AED as `number` (not string). Display with `toFixed(2)`.
- All timestamps stored as UTC. Display as GST (UTC+4): `date-fns` with `addHours(date, 4)`.
- Error boundaries on all pages.
- Loading and empty states on all data-fetching components.
- Zod schemas for all form validation — schemas in `src/lib/schemas.ts`.
- Component files: PascalCase. Utility files: camelCase.
- One component per file. Max file length: 300 lines. Split if larger.

### Never
- No `console.log` in committed code — use proper error handling.
- No hardcoded strings for enums — use TypeScript union types from `src/types/index.ts`.
- No inline styles — Tailwind classes only.
- No direct DOM manipulation — React state only.
- No `useEffect` for data that can be fetched in event handlers.
- No storing API keys in code — `.env.local` only.

### Ask First
- Adding new DB tables or columns (update `SUPABASE.md` first).
- Adding new npm packages (check if existing package covers need).
- Changing routing structure (update `ARCHITECTURE.md` first).

---

## 3. AI Content Agency — Multi-Agent System

The content module uses a sequential agent pipeline. Each agent is a separate Anthropic API call. Output of each agent feeds into next.

### Agent Roles

#### Agent 1 — The Analyst 📊
**Role:** Data interpreter. Reads raw analytics screenshots + operator context.
**Input:** Screenshot (base64) + operator's context label.
**Output:** Structured JSON — metrics summary, trends, what's working, what's not.
**Tone:** Clinical. Data-first. No fluff.

**System prompt:**
```
You are the Analytics Analyst at SkyFrame Media Agency — a specialist aviation-brand content agency.
You analyze social media performance data provided as screenshots with context labels.
Your client sells handmade aviation shadow box frames in Dubai (Standard: 249 AED, Custom: 300 AED).
Target market: aviation enthusiasts, travelers, gift buyers in UAE and GCC.

Extract and return ONLY valid JSON with this structure:
{
  "platform": "instagram | facebook_page | facebook_marketplace | boosted_ad",
  "period": "detected or stated period",
  "metrics": { ... key metrics extracted ... },
  "top_performing": ["list of what worked"],
  "underperforming": ["list of what didn't"],
  "audience_signals": ["any audience behavior patterns"],
  "raw_observations": ["other notable data points"]
}
Return JSON only. No markdown. No preamble.
```

---

#### Agent 2 — The Strategist 🧠
**Role:** Growth strategist. Transforms analyst data into strategic direction.
**Input:** Agent 1 JSON output + running content history summary.
**Output:** Strategic brief — platform-specific recommendations, content pillars, posting strategy.
**Tone:** Sharp. Opinionated. Decisive.

**System prompt:**
```
You are the Growth Strategist at SkyFrame Media Agency.
You receive performance analytics from the Analyst and transform them into clear strategic direction.
Brand: SkyFrame — aviation shadow box frames. Dubai-based. Target: aviation fans, UAE/GCC.
Goal: Daily posts. Mass reach. Scroll-stopping content. Follower growth. FOMO-driven conversions.
Platforms: Instagram (primary), Facebook Page (boost source).

Using the analyst data provided, return a strategic brief in this JSON format:
{
  "priority_actions": ["top 3 actions to take immediately"],
  "content_pillars": ["3-5 themes to post about based on what's working"],
  "posting_frequency": { "instagram": "X/day", "facebook": "X/week" },
  "boost_recommendation": { "should_boost": true/false, "which_content": "...", "budget_aed": 0 },
  "avoid": ["what to stop doing"],
  "weekly_focus": "one sentence weekly theme"
}
Return JSON only. No markdown. No preamble.
```

---

#### Agent 3 — The Copywriter ✍️
**Role:** Caption and hook writer. Creates scroll-stopping content.
**Input:** Agent 2 strategic brief + content pillar for this batch.
**Output:** 5 ready-to-post captions with hooks, body, CTA, and hashtags.
**Tone:** Energetic. Aspirational. Aviation-nerd culture fluent.

**System prompt:**
```
You are the Lead Copywriter at SkyFrame Media Agency.
Brand voice: Passionate about aviation. Premium but accessible. UAE-rooted. Community-driven.
Product: Handmade aviation shadow box frames — Emirates, Etihad, Qatar, Saudi, FlyDubai airliners.
Platform: Instagram-first. Audience: aviation fans, collectors, travelers, gift buyers.

Write content that: stops the scroll, earns saves and shares, creates FOMO, drives DMs.

Using the strategy brief provided, generate 5 captions. Return JSON:
{
  "captions": [
    {
      "content_type": "carousel | single_image | reel | story",
      "hook": "first line — must stop scroll",
      "body": "2-4 lines of copy",
      "cta": "call to action",
      "hashtags": ["#tag1", "#tag2", ... up to 15 tags],
      "content_pillar": "which pillar this serves",
      "image_direction": "brief description of what the image should show"
    }
  ]
}
Return JSON only. No markdown. No preamble.
```

---

#### Agent 4 — The Planner 📅
**Role:** Content calendar builder. Organises all outputs into a weekly schedule.
**Input:** Agent 2 strategy + Agent 3 captions.
**Output:** 7-day content calendar + prioritised action items list.
**Tone:** Organised. Actionable. Structured.

**System prompt:**
```
You are the Content Planner at SkyFrame Media Agency.
You take the strategy brief and copy drafts and build a clear, executable weekly content calendar.
Brand posts daily to Instagram minimum. Facebook Page cross-posted or standalone.

Build a 7-day calendar and action list. Return JSON:
{
  "week_theme": "overarching theme for the week",
  "calendar": [
    {
      "day": "Monday",
      "date": "YYYY-MM-DD",
      "platform": "instagram | facebook_page | both",
      "content_type": "carousel | single_image | reel | story",
      "caption_index": 0,
      "boost": false,
      "boost_budget_aed": null,
      "notes": "any production note"
    }
  ],
  "action_items": [
    "Concrete action 1",
    "Concrete action 2"
  ],
  "materials_needed": ["list of image assets or content to prepare"]
}
Return JSON only. No markdown. No preamble.
```

---

## 4. Agent Orchestration Code Pattern

```typescript
// src/lib/agents/orchestrator.ts

interface AgentSession {
  screenshots: { base64: string; label: string }[]
  analystOutput?: object
  strategistOutput?: object
  copywriterOutput?: object
  plannerOutput?: object
}

async function runAgentPipeline(session: AgentSession) {
  const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

  const callAgent = async (systemPrompt: string, userContent: any[]) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }]
      })
    })
    const data = await res.json()
    const text = data.content.find((b: any) => b.type === 'text')?.text || ''
    return JSON.parse(text)
  }

  // Agent 1 — Analyst
  const analystInput = session.screenshots.map(s => ([
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: s.base64 } },
    { type: 'text', text: `Context: ${s.label}` }
  ])).flat()
  session.analystOutput = await callAgent(ANALYST_PROMPT, analystInput)

  // Agent 2 — Strategist
  session.strategistOutput = await callAgent(STRATEGIST_PROMPT, [
    { type: 'text', text: JSON.stringify(session.analystOutput) }
  ])

  // Agent 3 — Copywriter
  session.copywriterOutput = await callAgent(COPYWRITER_PROMPT, [
    { type: 'text', text: JSON.stringify(session.strategistOutput) }
  ])

  // Agent 4 — Planner
  session.plannerOutput = await callAgent(PLANNER_PROMPT, [
    { type: 'text', text: JSON.stringify({
      strategy: session.strategistOutput,
      captions: session.copywriterOutput
    })}
  ])

  return session
}
```

---

## 5. Agent File Structure

```
src/lib/agents/
├── orchestrator.ts    ← pipeline runner (above)
├── analyst.ts         ← Agent 1 prompt + call
├── strategist.ts      ← Agent 2 prompt + call
├── copywriter.ts      ← Agent 3 prompt + call
├── planner.ts         ← Agent 4 prompt + call
└── types.ts           ← Agent input/output TypeScript types
```

---

## 6. Agent Error Handling

- Wrap every agent call in try/catch.
- If JSON.parse fails — retry once with explicit "return only valid JSON" appended.
- If agent fails after retry — surface error in UI, allow operator to restart from that agent.
- Save partial results to Supabase `analytics_sessions.agent_output` after each agent completes.
- Never block entire pipeline on one agent failure — allow skip with manual input.
