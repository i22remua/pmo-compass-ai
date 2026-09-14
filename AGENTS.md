# PMO Compass AI

## Project
Portfolio project by Álvaro Redondo Muñoz. Next.js/TypeScript frontend, FastAPI/Pydantic AI service, Firebase Auth + Firestore. Spanish and English are equally supported.

## Working conventions
- Keep UI, repositories, authentication, and AI providers separate.
- Read README.md and the nearest source files before changing behavior.
- Maintain all UI dictionary keys in `frontend/src/locales/es.ts` and `en.ts`.
- Never present demo templates as a live language model. Preserve source facts and label suggested assessments, missing information, and inferred actions.
- Demo data stays in browser localStorage. Cloud access uses Firebase Auth and owner-scoped Firestore queries/rules. Never silently fall back from cloud to demo storage.
- Do not commit credentials, `.env` files, or service account keys. Browser Firebase config is public; service credentials are not.
- Maintain project ownership and document-parent ownership invariants when changing Firestore rules. Document deletion must remain retryable.
- Add meaningful tests for authentication, ownership, generation, and persistence changes. Use the Firebase emulator for rules.
- Do not add dependencies or abstractions without a concrete need.

## Commands
`npm run setup`, `npm run dev`, `npm run check`, `npm run test:e2e`, `npm run test:rules`.
Backend tests run through `npm run test:api`; Python environment lives at `backend/.venv`.

## Delivery
Explain what changed and which checks ran. Keep README and roadmap accurate. Do not claim live Firebase/Ollama verification if only mocks or emulators ran.
