# Architecture

PMO Compass AI separates interaction, identity, storage and document generation. The same product workflow works with browser-only demo data or a private Firebase account.

## System overview

```mermaid
flowchart TB
    Visitor[Visitor or project manager] --> UI[Next.js App Router / React / TypeScript]
    UI --> Locale[ES/EN and theme providers]
    UI --> Auth[Firebase Authentication]
    UI --> Repo[Workspace repository]
    Repo --> Local[Demo localStorage]
    Repo --> Firestore[Firestore / owner-scoped rules]
    UI -->|Project snapshot, format, language, context| API[FastAPI / Pydantic]
    Auth -->|ID token for private generation| API
    API --> Service[Generation service / AIProvider]
    Service --> Demo[Demo templates]
    Service --> Ollama[Local Ollama]
    Service --> External[External extension point]
    Service -->|Markdown, risks, warnings and actual provider| UI
```

## Frontend

`frontend/src/app` contains the public landing, login, demo entry and workspace routes. The root layout loads shared fonts, theme initialisation and application providers. Private data is loaded in the browser with the authenticated SDK rather than rendered into Next.js server output.

Client components manage forms, locale, theme, authentication and the workspace. `WorkspaceProvider` refreshes data on entry, mutations, focus and storage events. `repository.ts` encapsulates project/document persistence; `api.ts` encapsulates generation transport and errors. Components do not choose an AI SDK or embed prompts.

The workspace shell provides auth-aware navigation, mobile navigation and loading/error states. A navigation guard improves UX; it is not the security boundary. ES/EN dictionaries have typed key parity, and document language is independent of interface language. Semantic tokens share light/dark surfaces between landing and private pages.

Markdown rendering skips raw HTML and external images. React Markdown sanitises link URLs; external links use `noopener noreferrer`. Provider output is displayed as document content, never executed.

## Backend

`backend/app/main.py` composes FastAPI, CORS, request-size/error handling and API routes. Pydantic validates the project snapshot, document type, language, context and fallback choice. `api/auth.py` verifies Firebase ID tokens when required. Routes apply process-local rate limits.

The backend is stateless with respect to project content. It does not query Firestore for projects or save generated documents. A caller supplies the snapshot; the response is a draft for review. Storage ownership is checked independently when the browser saves it.

| Endpoint | Responsibility |
| --- | --- |
| `GET /api/v1/health` | Report API status and configured provider/model, without contacting the model |
| `POST /api/v1/generate` | Authenticate when configured and use the selected provider |
| `POST /api/v1/demo/generate` | Public deterministic template generation |

Errors use stable codes and omit source notes/provider internals. The current rate limiter is per process; a production multi-instance service would need shared quotas and trusted proxy configuration.

## Firebase and data boundaries

Firebase Authentication manages email/password accounts. Cloud Firestore contains `users`, `projects` and `documents`; see [database schema](database-schema.md).

Cloud repository queries include `ownerId == uid`. Rules enforce ownership, immutable ownership/creation fields, valid document types, and an active owned project for document creation. Rules do not act as query filters. Documents are immutable after saving; identical retries are allowed.

The backend uses Firebase Admin solely for ID-token verification, including revocation checks. Server credentials remain outside browser code. Cloud access never silently falls back to localStorage after an error.

## Authentication flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Next.js browser
    participant Auth as Firebase Auth
    participant DB as Firestore
    participant API as FastAPI
    User->>UI: Register or log in
    UI->>Auth: Email/password through Firebase SDK
    Auth-->>UI: Authenticated account
    UI->>DB: Create/sync own profile in transaction
    Note over UI,DB: Preserve createdAt and preferred language
    UI->>DB: Query projects/documents for ownerId == uid
    DB-->>UI: Records allowed by rules
    User->>UI: Generate a document
    UI->>Auth: Get current ID token
    UI->>API: Project snapshot + Bearer token
    API->>Auth: Verify token and revocation
    API-->>UI: Validated generated draft
```

Demo entry creates a browser-local demo identity and loads fictional examples. This is a playground, not an authentication scheme. A demo session has no entitlement to cloud records. Entering the demo from a cloud account leaves cloud data intact; an explicit login returns to the account. Logging out clears the active demo marker and signs out Firebase when configured.

## Project and document data flow

1. Create a project. The repository validates it, attaches owner/timestamps and writes to the selected store.
2. Save notes explicitly. “Generate with AI” from project notes first saves pending edits, then opens the generator.
3. The generator loads the selected project's saved context. A collapsible source preview exposes the notes used for generation.
4. The browser sends only the project context fields, document type, language and extra context to FastAPI.
5. The selected provider returns a validated draft. The service assigns its ID, timestamp and actual provider.
6. The preview retains the project, type, language and context of that generation. Changing controls does not reattribute an existing output.
7. Copy and download use the displayed Markdown. Save writes the draft UUID to the current repository; identical retries are safe.
8. History reloads persisted documents and their provider/warnings. Generation itself never saves automatically.

## AIProvider architecture and generation flow

`AIProvider.generate(GenerationRequest) -> ProviderResult` is asynchronous. `factory.py` creates the configured adapter; `service.py` adds response metadata and handles explicit fallback. Prompts and document blueprints are shared independently of the HTTP routes.

- `DemoAIProvider`: deterministic bilingual PMO templates with rule-based source extraction.
- `OllamaAIProvider`: local HTTP request, bounded timeout, schema-guided JSON and source-evidence validation.
- `ExternalAIProvider`: typed placeholder returning a clear unconfigured error; no paid request implemented.

```mermaid
sequenceDiagram
    actor PM
    participant UI as Generator
    participant API as Generation service
    participant Model as Ollama
    participant Demo as DemoAIProvider
    PM->>UI: Generate
    UI->>API: Validated input
    API->>Model: Local request
    alt Model produces valid output
        Model-->>API: Markdown, risks, warnings
        API-->>UI: provider=ollama
    else Model fails
        Model-->>API: Unavailable / timeout / invalid output
        API-->>UI: Clear error + fallbackAvailable
        PM->>UI: Continue with demo templates
        UI->>API: Same inputs + useDemoFallback=true
        API->>Demo: Generate directly
        Demo-->>API: Template output
        API-->>UI: provider=demo + fallbackFrom=ollama + warning
    end
    PM->>UI: Review and save
```

Fallback changes the generator, not authentication or storage. In a Firebase deployment, demo users call the public template endpoint regardless of the private provider. `AI_PROVIDER` and `AUTH_MODE` are deliberately independent.

Structural validation and matching risk quotes do not prove the entire narrative correct or eliminate prompt injection. There are no autonomous tool actions. See [AI strategy](ai-strategy.md).

## Demo lifecycle and seeding

`demo-projects.json` defines six bilingual project contexts. `npm run seed:demo` uses the actual demo provider to rebuild six documents per language into `demo-documents.json`. The script writes only that fixture file.

On first entry, the repository seeds `pmo.workspace.v1.<demo-uid>`. **Load missing examples** adds only absent stable project IDs and their fixture documents. It never replaces an existing project or document and is idempotent. An older four-project workspace can add the two new sectors without losing edits. Intentionally deleted documents under an existing project are not restored by this additive operation.

**Reset demo data** is a separate destructive local operation with a confirmation dialog. Both repository operations reject Firebase identities before touching data. Neither inserts examples into Firestore.

## Deletion and retry behavior

Cloud project deletion marks `deleting: true`, blocking new documents under that project. It deletes owned children in batches of up to 400, then deletes the parent. A failed operation leaves the project visible for retry; it does not reverse the tombstone. Local deletion removes the project and its documents in one localStorage write.

Firestore has no automatic cascade. Rules allow owners to read/delete orphaned documents for cleanup. A future trusted background job should make deletion durable across devices and unusual manual data operations.

## Current tradeoffs

- Whole-workspace loading, client-side sorting/search and no pagination target a personal portfolio demonstration.
- localStorage has device scope, quotas and no concurrent-write transactions or protection from others using the same browser profile.
- Refresh on focus is not realtime collaboration; simultaneous edits can overwrite one another.
- ISO client timestamps simplify the two stores but are not trusted audit chronology.
- No live deployment, paid provider or model installation is required for the local demo.
- Request cancellation stops waiting in the frontend; guaranteed cancellation inside the model is future work.

## Verification

pytest exercises contracts, generation and error behavior. Playwright exercises project CRUD, source notes, save/copy/export, reload, themes, responsive layouts, safe demo additions and provider fallback. Firebase emulators verify rules and real SDK workflows across separate accounts. axe covers supported automated WCAG A/AA checks on nine routes in both themes.

See [validation](VALIDATION.md) for executed checks and [roadmap](product-roadmap.md) for acceptance criteria beyond the MVP.
