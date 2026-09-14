# Apps

```text
apps/
├── fitness/
├── finance/
├── hustle/
│   ├── experimenter/
│   ├── analytics/
│   ├── ads/
│   └── creative/
├── goals/
├── time/
└── films/
```

Each product is a small Next.js app with thin `app/` routes, product composition, and its `app.manifest.json`. Reuse platform capabilities for data access, branding, and components. All new components belong in `platform/` by default; creating an app-local component requires explicit user permission and it must be specific to that app. See the root [AGENTS.md](../../AGENTS.md).

Create an app with:

```bash
pnpm create:app finance Finance
pnpm install
pnpm --filter @nomos/finance dev
```

The generator creates the app under `apps/<slug>`, uses the shared `@nomos/ui` shell rather than copying navbar/sidebar/AI-agent source, registers its manifest in the waffle menu for every app, and validates a production build before provisioning Firebase Hosting, `<slug>.nomos.codes`, and Cloudflare DNS.

For a nested Hustle app, use a slug such as `hustle-experimenter` unless a future workspace-specific grouping requires a custom generator rule.

## Goals: quarterly quests MVP

Goals opens `/today/`, with navigation ordered Today, Quests, Reviews, Reports.
Today, Reviews, and Reports are placeholders. Quests lives at `/quests/`;
the old `/quarterly-questions/` address redirects there. Each quarter contains exactly six facts
(one for each quest: work, life, career, chores, and two hobbies), three shared
feelings, and one shared function. Edit and save the entire quarter together;
unfinished drafts can be saved. Quarter tabs, a previous-quarter control, a year
selector and previous/next year controls support history and future drafts.
Future quarter tabs display a Draft badge, including empty drafts. Select a
quarter and choose Write quarter to fill it in, then Save quarter.

The component and styles live in `platform/ui/src/quarterly-quests.*`.
Browser-local records use `nomos.goals.quarters.v2`, keyed by year and quarter.
The old v1 quest data is preserved untouched, not automatically converted.
Only an unsaved current quarter shows labelled sample content; other unsaved
quarters are blank. No backend sync or other productivity pages are included.

## Weekly reviews

`/reviews/` provides ISO week/year navigation and editable top-three priorities,
wins and improvements. Reviews are browser-local under
`nomos.goals.weekly-reviews.v1`, keyed by the week's Monday. Quarter membership
uses that Monday; each review snapshots the six saved quarter facts.
The six generated metrics count wins explicitly linked to each quest through
that week within the quarter. These are evidence counts, not completion rates
or connected fitness/finance activity. Empty evidence is shown honestly.

Planner photos use the existing authenticated `/api/ai/planner-import?appId=goals`
endpoint. Users choose Read planner to send the photo, inspect/correct extracted
notes, link wins to quests, and save. Photos are not persisted by the UI.
The server reader requires its configured OpenAI key. Browser checks covered
editing, week isolation, persistence, metrics, mobile width and a mocked reader
response; live handwriting accuracy has not been verified.

## Today: morning manifesto

`/today/` is an always-editable daily scratch pad with Focus, To change / improve,
and To buy / resources needed. Text saves on each change to a separate
`nomos.goals.morning.v1.YYYY-MM-DD` browser-local record. Date controls revisit
past days. The affirmation rotates deterministically through seven original
senior-engineering affirmations; it is not a live AI generation.

Weekly priorities use the preceding week's review (its week-ahead plan), falling
back to the selected week's review when needed. The review link opens the source
week via `?week=YYYY-MM-DD`. Empty priorities stay empty instead of showing sample
user data. Browser tests cover saving/reload, date isolation, mobile width,
priority lookup and linking to the source review.

Today shows a quarter badge, a coloured morning panel and six quest progress
bars. These are user-set completion estimates, adjusted on Quests and saved
separately for each quarter under `nomos.goals.progress.v1.YYYY-QN`.
Unset values display Not set. They are independent of the linked-win counts
on Reviews. Today links to the corresponding quarter via `/quests/?quarter=YYYY-QN`.

## Goals workspace refresh

Navigation is Today, Week, Quests, Reports. `/week/` replaces `/reviews/` (the
old address redirects and preserves its week query). Week prioritises the top
three priorities and places compact quest evidence below the writing sections.
Today starts each scratch pad at two lines and expands with its content.
Quest completion estimates use five buttons under each quest (0/25/50/75/100)
and remain shared with Today's progress bars.

Monthly reports automatically aggregate saved weekly wins, improvements and
daily focus notes. A week belongs to the month containing its Monday. The
current month is a partial report. No AI-generated interpretation or scheduled
backend job is implied; aggregation refreshes on navigation, focus or storage
changes. Months without records show an empty report.

The labelled demo workspace seeds missing current-day, current-quarter and
recent weekly records once (`nomos.goals.demo.v1`), preserving existing entries.
Reports use those records directly, so demo figures agree across pages.

## Admin

Admin is a minimal workspace at `https://admin.nomos.codes`, created with
`pnpm create:app admin Admin`. Its root route is empty and its root layout
composes `NomosProductShell` from `@nomos/ui` for shared authentication,
navigation, theme, assistant, and safe-area handling. No admin features are
implemented yet. Production updates use `nomos deploy`.
