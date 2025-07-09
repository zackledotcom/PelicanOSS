# Project Guidelines

1. What is the project structure?
   A:

Electron + Vite + React (TypeScript) Desktop App

Main folders:

src/main/ — Electron main process (Node, IPC, service orchestration)

src/preload/ — Preload scripts (secure IPC bridge to renderer)

src/renderer/ — Frontend (React UI, all TSX components, context, hooks)

components/ — UI components (chat, overlays, panels, buttons, etc.)

hooks/ — Custom hooks (service/data fetching, state management)

modals/ — Overlay components

ui/ — shadcn/ui primitives (Button, Switch, etc.)

globals.css — Global styles, Tailwind+custom

App.tsx — Main app entry (renders layout and routes)

All AI/model logic handled via IPC from renderer → main → Ollama/ChromaDB.

2. Should Junie run tests to check the correctness of the solution?
   A:
   YES.

Always run the project (npm run dev) to verify zero errors/warnings, and that all UI/buttons work after any change.

If unit or integration tests exist (npm test or pnpm test), run them and confirm all pass.

If no formal tests are present, manual testing in the UI is required for every core flow (chat, upload, agent, memory, overlays).

3. How does Junie run tests?
   A:

Primary:

Start development build:

arduino
Copy
Edit
npm install
npm run dev
This launches Electron with live Vite/React renderer and logs errors/warnings in both terminal and browser console.

If formal tests exist:

bash
Copy
Edit
npm test
or

bash
Copy
Edit
pnpm test
Review any .test.ts(x) or /**tests**/ files for test coverage.

If unclear:

Check package.json scripts for test or related entries.

If no tests, perform manual interactive testing of all key UI flows.

4. Should Junie build the project before submitting?
   A:
   YES, if you change any core UI, logic, or dependencies.

Run:

arduino
Copy
Edit
npm run build
This will compile both renderer (Vite) and main process code, and surface any build errors.

Ensure the build completes with zero errors or warnings before submitting or merging.

Also, always run npm run dev again after any build to confirm the app starts and all buttons/interactions work.

5. Code-style instructions for Junie
   A:

TypeScript strict mode everywhere—no JS/JSX, no any types

shadcn/ui components for all buttons, dialogs, overlays (never raw <button> or HTML controls)

Phosphor icons only (no Heroicons or others)

TailwindCSS for all layout, spacing, color, border, shadow, glass, and gradients—use classes, not inline style

Consistent spacing: Minimum py-4 px-6 in overlays/panels, gap-4 or higher in flex/grids

Color system:

Dark: #090909/#202124 backgrounds, #bfeafe accent, white font

Light: #fff/light grey backgrounds, #21242b text, one dark grey accent

No mint, no legacy greys, no off-brand colors

Glass/gradient surfaces:

Use backdrop-blur, translucent white overlays, 1–2px borders, Apple-like polish

No commented-out/dead code, no leftover legacy (Vue/Heroicons/etc)

Accessible: All interactive elements must have keyboard navigation and accessible labels

1. Delete Only What Is Clearly Unused or Explicitly Listed.

Remove demo, legacy (Vue, Heroicons), “showcase” components, or code called out by task, review, or obvious dead status (e.g. not imported anywhere).

If a file/component is “maybe unused” or ambiguous, comment it out and flag for review—don’t hard-delete.

2. No Unrequested Refactor or File Creation.

Don’t add, rename, or re-organize files unless directly told.

No code “tidying,” no wholesale style refactors, no moving logic.

3. Never Break Functionality.

Always test app (UI, core features, all buttons) after each change:

npm run dev and check every panel and button.

If a deletion breaks an import or function, revert and escalate.

4. Only Touch What the Task Describes.

Limit edits strictly to the files/lines/components named in the instructions.

Do not “fix” unrelated issues you encounter—make a note for future review instead.

5. Document Every Deletion/Change.

At the end of your session, make a concise list:

Files removed

Files edited (with reason)

Anything you flagged as ambiguous

6. If Unsure—Comment, Don’t Delete.

For files or lines that look unused but aren’t 100% clear, wrap in comments and leave a TODO: Review for removal note.

7. Never Break Build or UI Flow.

If anything throws an error, undoes a working feature, or causes a linter/type check failure, immediately undo your last change.
