# Frontend CLAUDE.md

## Stack

- **React 18** + **TypeScript** (strict mode, no `any`)
- **Vite** for bundling and dev server
- **React Router v6** for client-side routing
- **TanStack Query** (React Query) for all server state
- **Zustand** for local UI state that spans components (e.g. `combatStore`)
- **Axios** as the HTTP client (configured in `src/api/client.ts`)
- **Lucide React** for icons

## Directory Layout

```
src/
├── api/           # API call functions (one file per domain)
├── components/
│   ├── knowledge/ # BookUploader, BookList, ChatMessage
│   └── combat/    # InitiativeTracker, MonsterLookup, MonsterCardPanel, NewEncounterModal
├── pages/         # KnowledgePage, CombatPage (thin — delegate to components)
├── store/         # combatStore.ts (Zustand)
└── types/         # Shared TypeScript types (index.ts)
```

## Data Flow

- **Server state** (books list, active encounter): managed by TanStack Query. Always invalidate the relevant query key after a mutation.
- **Client UI state** (open monster cards, current encounter snapshot): managed by Zustand `combatStore`.
- **Don't duplicate** server state in Zustand. The store holds the encounter because multiple components need to write to it locally between refetches; books are query-only.

## Styling

- Global CSS variables defined in `src/index.css` (`:root` block). Use them everywhere.
- Component-scoped styles use `<style>` tags inline (scoped by class names — no CSS Modules or Tailwind yet).
- Dark fantasy theme: deep navy/indigo background, crimson accent (`--accent`), gold for headers (`--gold`).

## Testing

All tests live in `tests/` (sibling to `src/`).

| Layer | Tool | Location |
|---|---|---|
| Unit | Vitest + React Testing Library | `tests/unit/` |
| Integration | Vitest + MSW (API mocking) | `tests/integration/` |
| E2E | Playwright | `tests/e2e/` |

Run tests:
```bash
npm test              # unit + integration (Vitest, one-shot)
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright (requires dev server running)
npm run test:coverage # coverage report
```

**Rules:**
- Every new component gets a unit test covering: renders without crash, renders key content, handles interaction/props correctly.
- New API functions get integration tests with MSW handlers.
- New pages get a Playwright smoke test.

## Adding a New Feature

1. Add types to `src/types/index.ts`
2. Add API functions to `src/api/<domain>.ts`
3. Build component in `src/components/<domain>/`
4. Wire into page in `src/pages/`
5. Write tests before marking done

## Environment

`frontend/.env.local` (not committed):
```
VITE_API_BASE_URL=http://localhost:8000
```

If not set, defaults to `http://localhost:8000`.
