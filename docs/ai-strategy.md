# AI strategy

The default `auto` router tries Gemini, Groq, OpenRouter and Offline PMO Engine in order. Generation and persistence are separate: providers return reviewable drafts and never write Firestore. The user saves explicitly. [Configuration, free-tier eligibility and official sources](deployment.md).

## Shared contract

`GenerationRequest` contains a bounded project snapshot, eight document types, ES/EN, additional context, `useOfflineFallback`, up to three previous drafts (4,000 characters each) and an optional Copilot question. Unknown fields are rejected. The legacy `useDemoFallback` flag remains compatible.

`ProviderResult` contains Markdown with a title (100–100,000 characters), up to 30 risks and 20 warnings. Every risk includes source `provided` or `inferred`, evidence, cause, impact, probability, severity, priority, mitigation, early warning and suggested owner role. The service adds ID, date, actual provider, fallback provenance and qualitative Project Intelligence. Saved documents retain actual provider and warnings; `fallbackFrom` and intelligence are response metadata, with provenance also embedded in the saved content.

## OfflinePMOProvider

This is an explainable rules/templates engine, not a language model. PMOInferenceService combines source signals, sector patterns and ERP/CRM hypotheses. It can propose risks from minimal context while keeping missing budget, dates, owners and approval decisions unconfirmed. Source quotations preserve their original language. Negative/future statements are distinguished from reported incidents/completed progress.

Each format has a distinct structure and four shared provenance sections: provided information, inferred assumptions, missing information and recommended next steps. Risks and mitigation actions require human validation. Confidence describes information completeness, not predictive certainty. Health remains unknown/review-required when there is insufficient evidence.

Starter document fixtures are rebuilt with `npm run seed:starter`. The legacy class/file/storage names remain for compatibility; new output identifies as `offline`. The engine needs FastAPI to be reachable, even though it does not need an external model.

## External adapters

GeminiProvider, GroqProvider and OpenRouterProvider share bounded server-only HTTPX transport, provider-neutral PMO prompts and Pydantic validation. Secrets are never placed in URLs, returned to the browser or logged in upstream error bodies. No redirects or tool calls are enabled. Total timeouts, response-size limits, completion checks and validation failures trigger automatic fallback.

Prompts treat project content as untrusted data. Previous drafts may improve structure and clarity but are never source evidence. Provided-risk quotes must match actual input; inferred risks remain hypotheses. A trusted appendix records original context and missing fields. This does not mathematically verify every sentence produced by a model; project-manager review remains mandatory.

`free_only` rejects paid OpenRouter model IDs and sends a zero-price routing constraint. Gemini/Groq require operator confirmation of free, unbilled accounts and use a reviewed model allowlist. Their APIs do not support a universal per-request free-only billing flag. The model/default choice and billing responsibility are documented in [deployment](deployment.md).

## OllamaAIProvider

Optional local configuration: `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=llama3.1`, `OLLAMA_TIMEOUT_SECONDS=120`. Install/run Ollama independently. Neither startup nor health contacts the model. Failure now falls back automatically to OfflinePMOProvider; the saved warning and actual provider make that visible.

## Failure and quota behavior

The service catches stable ProviderError codes: missing key/model, unconfirmed free tier, disallowed model, HTTP 429, connection/timeout failures, malformed/oversized/incomplete responses and invalid evidence. It tries the next configured adapter, ending offline. Direct offline selection skips remote transport. Authentication and input validation are never bypassed by fallback.

Public `/workspace/generate` applies IP quotas; private `/generate` adds a verified UID quota. Daily/minute free budgets reserve attempts before remote work, including failures. Exhaustion generates offline with a warning. The outer request limiter returns 429. All quota state is process-local; one worker is supported, restarts reset limits, and multiple replicas require shared quota storage.

## PMO Copilot

An optional question uses the same bounded provider router and project snapshot. External models answer it through the PMO contract. Offline mode supports risks, decisions, client/management updates and suggested next actions using explicit rules. It does not claim open-ended language-model reasoning. The UI can copy the response; there is no persistent chat history.

## Evaluation and next steps

Tests cover each adapter's request shape, missing keys, quota/network/timeouts, invalid output, routing order, free-only protection, bilingual sparse input, source provenance and owner-scoped persistence. HTTP mocks and emulators do not establish live provider quality or Firebase configuration. Future work: a bilingual quality benchmark, shared quotas, streaming, document review/version history and authorised retrieval with citations.
