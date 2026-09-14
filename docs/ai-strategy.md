# AI strategy

PMO Compass AI treats generation as one step in a reviewable PMO workflow. Project context, output contracts, failure handling and persistence are separate from the model choice. The default experience needs no paid AI service.

## Product principles

1. Use the supplied project context and distinguish facts from proposals.
2. Produce a document-specific structure in the selected language.
3. Surface missing information instead of inventing dates, owners, progress or approval.
4. Show the actual provider, preserve warnings and keep saving explicit.
5. Make the complete product testable without credentials or a downloaded model.

## Shared contract

`GenerationRequest` contains the project snapshot, one of eight document types, `es` or `en`, additional context and `useDemoFallback` (default false). Unknown fields are rejected; strings and dates are bounded/validated.

`AIProvider` exposes a stable `name` and `async generate(request) -> ProviderResult`. The result contains:

| Field | Contract |
| --- | --- |
| `content` | 100–100,000 characters, beginning with a non-empty Markdown H1 |
| `risks` | Up to 30 objects: risk, evidence, cause, impact, probability, severity, mitigation, signal and suggestedOwner |
| `warnings` | Up to 20 non-empty warnings |

Risk fields and each warning are bounded to 2,000 characters. `service.py` adds ID, UTC timestamp, document type, language, provider and optional `fallbackFrom`. The UI persists the actual provider and warnings with the document.

## DemoAIProvider

The demo is **deterministic rule-based generation**, not an LLM. It uses document blueprints plus the project's name, sector, description, objectives, dates, status, budget, stakeholders, notes and additional context. The templates and extraction utilities are in `demo.py`, `blueprints.py` and `analysis.py`.

| Format | Distinct emphasis |
| --- | --- |
| Executive brief | Purpose, objectives, project fact sheet, dependencies and sponsor questions |
| Weekly status | Reported progress versus future work, concerns and next steps |
| Risk register | Source quotes, possible causes, proposed ratings and mitigation |
| Meeting minutes | Topics, recorded versus pending decisions and actions |
| Action items | Explicit owner/date references, suggested assignments and closure criteria |
| Stakeholder email | Subject, recipient context, update and requests for confirmation |
| Scope change | Baseline, requested change, impact dimensions and approval options |
| Lessons learned | Observations, possible causes, recommendations and improvement actions |

Additional context is prioritised before long notes. Selected source excerpts are bounded; warnings explain omitted context. Rules identify schedule, budget, scope, capacity, quality and approval signals and check clause-level negation. Explicit owners and date references are preserved where detected. Sparse input produces format-specific questions and preparation steps rather than empty filler.

The narrative and headings support Spanish and English. User-provided quotes retain their original language; this provider does not semantically translate arbitrary text. Proposed ratings, causes and owners require PM review. No matching risk signal does not mean the project has no risk.

The checked-in example documents are reproducible with `npm run seed:demo`, which always instantiates this provider regardless of environment settings.

## OllamaAIProvider

Ollama is optional and installed separately. Default backend configuration:

```dotenv
AI_PROVIDER=demo
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
OLLAMA_TIMEOUT_SECONDS=120
```

To use a local model:

```bash
ollama pull llama3.1
ollama serve
```

Use the existing Ollama service if it is already running. Set `AI_PROVIDER=ollama` in `backend/.env` and restart FastAPI. Change `OLLAMA_MODEL` to an installed model compatible with structured output. `AUTH_MODE=demo` allows local evaluation without Firebase.

The adapter sends a non-streaming request to `/api/chat`, with temperature `0.2` and the `ProviderResult` JSON schema as the requested format. Connection time is bounded to at most five seconds; the complete operation has a configurable timeout of up to 300 seconds. Neither startup nor `/health` contacts Ollama, so an absent installation never blocks the app from opening.

The adapter checks completion status, parses/validates the JSON and verifies that each risk's evidence appears in the supplied source text after whitespace normalisation. This rejects unsupported risk quotes but is not a factual verification of all narrative content.

| Failure | API code | User recovery |
| --- | --- | --- |
| Service unavailable | `provider_unavailable` / 503 | Start/check service, retry or select demo fallback |
| Model missing | `ollama_model_unavailable` / 503 | Install configured model or select fallback |
| Total timeout | `provider_timeout` / 504 | Retry, use a suitable model or select fallback |
| Incomplete response | `incomplete_provider_response` / 502 | Retry or select fallback |
| Invalid structure/evidence | `invalid_provider_response` / 502 | Retry or select fallback |

**Continue with demo templates** resends current inputs with `useDemoFallback: true`. The service goes directly to DemoAIProvider, without waiting on Ollama again. The response records `provider: demo`, `fallbackFrom: ollama` and a warning. Saved documents retain the provider and warning; `fallbackFrom` itself is response metadata rather than a separate database field.

Authentication, validation, rate limits and the chosen storage repository still apply. An unreachable FastAPI backend cannot offer template generation because the templates also run in FastAPI. There is no automatic provider switch.

## ExternalAIProvider

`external.py` is an implemented interface boundary with an intentionally unimplemented transport. Selecting `AI_PROVIDER=external` returns `501 external_not_configured`. It reads no provider keys, loads no paid SDK and sends no requests.

Future OpenAI, Gemini or another service can be added behind this contract:

1. Implement the adapter's asynchronous `generate` method and retain the persisted identifier `name = "external"` unless the domain/schema/rules are deliberately expanded.
2. Reuse `build_messages(request)` from `prompts.py`; adapt those messages and the output schema to the chosen service's current API.
3. Parse output into `ProviderResult` and reuse `validate_risk_evidence`. Map transport failures to `ProviderError`, omitting secrets and source content from errors.
4. Register construction in `factory.py` and add provider-specific settings on the backend only. Never put service keys in `NEXT_PUBLIC_*` variables.
5. Add mocked contract/failure tests, per-user usage limits and an explicit opt-in configuration before testing real requests.

No provider-specific paid API implementation is included. When adding one, consult that provider's current official API documentation; the UI and repository should continue to depend on the shared domain contract.

## Applied prompt engineering

`prompts.py` builds a system message with the PMO role, selected language, grounding requirements, output schema and instructions from the selected document blueprint. A separate user message serialises project fields and additional context as data.

This separation makes the intended task clear: notes containing commands are source material, not a replacement for the system instructions. Format-specific prompts explain what belongs in a brief, risk register, minutes, email or scope analysis. Shared review checklists identify missing fields and discourage unsupported completion claims.

The design combines several controls:

- **Role and audience:** professional PMO drafts for a manager or stakeholder review.
- **Task specificity:** separate output structures and questions for eight document types.
- **Grounding:** supplied facts, source quotes for risk signals and explicit missing information.
- **Structured output:** a common JSON contract with Markdown inside it.
- **Language control:** selected ES/EN narrative with preserved source evidence.
- **Post-generation checks:** schema, completion and evidence matching before preview.

These controls reduce predictable errors but do not eliminate hallucination or prompt injection. Users review content before saving/sharing. The model has no tools that send emails, modify projects or approve changes.

## Evaluation and next steps

Current tests cover all eight formats in both languages, sparse/large contexts, negation, explicit actions, pending decisions, response validation, timeouts and failure provenance. Ollama success/error payloads are mocked; a browser suite also exercises an actual failed local connection and explicit fallback.

A future bilingual evaluation set should measure factual support, required-section coverage, action specificity, evidence quality and language compliance across all four featured sectors. Compare models on the same inputs and record latency as well as output quality. RAG, cross-project reasoning, streaming and external providers remain planned, not advertised as present capabilities.

See [validation](VALIDATION.md) and [roadmap](product-roadmap.md).
