# AGENTS.md

Agentic UI is an open-source proposal for the frontend of an agentic app.

## Stack
Check `package.json` for the stack.
Make sure to always use the corresponding version.

## Commands
Check `package.json` for the commands.

## Structure

```
src/
├── components/         # Design System components
│   ├── ui/             # shadcn design system
├── routes/             # TanStack Router routes
└── lib/                # Every other reusable module
    ├── api/            # Data/Backend integration and client state colocated
    ├── hooks/          # General-purpose hooks
    └── utils/          # Very generic helpers
    └── ...etc          # Other libraries
```

## Principles

- **Colocation**: put code as close as possible to where it is used.
- **AHA (Avoid Hasty Abstractions)**: prefer duplication over the wrong abstraction. Abstract once reuse is real (e.g. a `useOpen` hook repeated everywhere), and then hold that code to a very high quality bar.

## Where code goes

Start at the narrowest scope that fits and promote code only when it is actually reused:

1. The route file itself.
2. Route-private folders (the `-` prefix keeps them out of routing): `-route/` for a layout route, `-index/` for an index route.
3. `-shared/` for code reused down a subtree (e.g. by `agents/index.tsx` and `agents/$agentId/index.tsx`).
4. `src/components/` for design system components. Think as it as a separate library that can be reused across different frontend apps
5. `src/lib/` for everything else (if there's a module, e.g. `authorization` that has React components, but it's not its focus, its ok to keep it in `src/lib` - in other words, is not forbidden to export React components from `src/lib`)

```
routes/(authenticated)/agents/
├── route.tsx           # layout route - not agents.tsx
├── index.tsx           # index route - not agents.index.tsx
├── -route/             # used only by route.tsx
├── -index/             # used only by index.tsx
├── -shared/            # shared by index.tsx and $agentId/
└── $agentId/index.tsx
```

**Big files**: split `Component.tsx` into `Component/index.tsx` plus siblings (`Component/Part.tsx`, or `Component/Part/index.tsx` if that part is big too). Don't split early: a component that fits in one file stays `Component.tsx`. If siblings start reaching into each other's internals, extract a shared module at the right level.

**Dependencies**: be very economical. Add one only for a hard problem with a high-quality library. Stable, generic libraries (React, TanStack, dayjs) can be imported anywhere; wrap less stable ones in a `src/lib/<name>` module and import from there.

**API**: keep types in `lib/api/types/`, and colocate TanStack Query hooks and query options with the backend code they call.

## Conventions

- **Types**: no `any` or loose types. Use zod as much as possible - and infer types from it (prefer the `type` than the `interface` keyword). Keep types simple, but think them through.
- **UX**: sweat the details, e.g. wrap icon-only buttons in a `Tooltip` with a clear description.
- **Accessibility**: give icon-only and other non-text controls an `aria-label`. Prefer semantic HTML and the shadcn primitives.
- **State**: `useState` for local state, props for parent/child, Context only for state that truly spans the tree, TanStack Query only for server state.
- **Test IDs**: add `data-testid` to key interactive elements for E2E tests.
- **Explicit code**: `Boolean(user)` over `!!user`; `function` declarations over arrow functions unless an arrow is needed. etc.
- **Exports**: named exports only, no `export default` (except where a tool requires it, e.g. config files). Named exports nudge coherence on the imports.
- **Imports**: `@/` for stable directories (`@/lib/...`, `@/components/...`); relative paths for nearby colocated files. Rename on clashes: `import { Header as UIHeader } from '@/components/ui/header'`.
- **Naming**: name by context. `agents/-index/Header.tsx` exports `Header`, not `AgentsHeader`.
- **File names**: Route files follow TanStack conventions. Elsewhere, use kebab-case (Linux is case sensitivity, so this is safer)
- **Comments**: explain why, not what. ASCII only (`-`, not `—`). Use `/** */` docblocks on declarations (types, members, functions, variables), `/* */` for any multiline comment, and `//` only for short single lines.

## Gotchas

- Never edit generated files, e.g. `routeTree.gen.ts`.
- shadcn here is built on Base UI: compose with the `render` prop (`<DropdownMenuTrigger render={<SidebarMenuButton />}>`), not Radix's `asChild`.
- Tailwind v4 has no `tailwind.config`; theme tokens live in `src/global.css`.

## Testing

No test runner is set up yet. Tests are a verification system to catch regressions and guide refactors: prioritize E2E, unit-test only modules complex enough to benefit, and colocate tests with the code they cover.
