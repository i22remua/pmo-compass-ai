# LinkedIn publication

Publish in **Spanish first**. The repository URL is verified and the post text below is ready to paste. Attach the Spanish MP4 or the selected screenshots from the local delivery pack. Upload the media directly with the post; no video URL is required. The demo uses fictional data and local templates, and the app is not yet hosted publicly.

## Publicación recomendada — Español

He construido PMO Compass AI: del ruido del proyecto a la claridad ejecutiva.

Un Project Manager transforma notas de reuniones, actualizaciones y solicitudes de stakeholders en informes cada semana. Quería construir un producto centrado en ese flujo de trabajo.

PMO Compass AI reúne el contexto del proyecto y ocho formatos PMO en un workspace bilingüe: resúmenes ejecutivos, informes de estado, registros de riesgos, actas, planes de acción, emails, análisis de cambios de alcance y lecciones aprendidas.

Desarrollado con Next.js, TypeScript, FastAPI y Firebase, incluye datos privados por cuenta, historial, copia/exportación y una demo con proyectos ficticios de distintos sectores.

Una capa AIProvider permite usar plantillas demo, generación opcional con Ollama local y añadir un proveedor externo en el futuro. La demo no necesita APIs de IA de pago.

Mi mayor aprendizaje ha sido diseñar el flujo completo alrededor de la generación: validación, evidencias, revisión humana, errores claros y guardado explícito. Las pruebas de API, navegador y emuladores Firebase cubren el comportamiento principal y el aislamiento entre cuentas.

Es un proyecto de portfolio profesional que conecta Ingeniería de Software, IA y Project Management. El repositorio documenta la arquitectura, las decisiones técnicas y el roadmap.

Repositorio: [i22remua/pmo-compass-ai](https://github.com/i22remua/pmo-compass-ai)

#SoftwareEngineering #GenerativeAI #ProjectManagement #NextJS #FastAPI #Firebase

## Recommended post — English

I built PMO Compass AI — from project noise to executive clarity.

Project managers turn meeting notes, delivery updates and stakeholder requests into reports every week. I wanted to build a focused product around that workflow.

PMO Compass AI brings project context and eight PMO document formats into a bilingual workspace: executive briefs, status reports, risk registers, meeting minutes, action plans, stakeholder emails, scope-change analysis and lessons learned.

Built with Next.js, TypeScript, FastAPI and Firebase, it includes private account data, document history, copy/export and a demo with fictional projects across several sectors.

A shared AIProvider contract supports deterministic demo templates, optional local Ollama generation and a future external-provider adapter. The demo requires no paid AI API.

My biggest learning was designing the full workflow around generation: validated inputs, source evidence, human review, clear failure states and explicit persistence. API tests, browser journeys and Firebase-emulator tests cover the core behavior and account isolation.

This is a professional portfolio project connecting Software Engineering, AI and Project Management. The repository documents the architecture, tradeoffs and roadmap.

Repository: [i22remua/pmo-compass-ai](https://github.com/i22remua/pmo-compass-ai)

#SoftwareEngineering #GenerativeAI #ProjectManagement #NextJS #FastAPI #Firebase

## Short version — English

I built PMO Compass AI: a bilingual workspace that turns project notes into reviewable PMO documents.

Next.js, TypeScript, FastAPI and Firebase, with a provider abstraction for demo templates, optional local Ollama and future external integrations. No paid AI API is required for the demo.

A professional portfolio project focused on the complete workflow: project context, generation, human review, private persistence and automated tests.

[i22remua/pmo-compass-ai](https://github.com/i22remua/pmo-compass-ai)

#SoftwareEngineering #GenerativeAI #ProjectManagement

## Versión corta — Español

He construido PMO Compass AI: un workspace bilingüe que transforma notas de proyectos en documentos PMO revisables.

Next.js, TypeScript, FastAPI y Firebase, con una capa de proveedores para plantillas demo, Ollama local opcional y futuras integraciones. La demo no requiere APIs de IA de pago.

Un proyecto de portfolio centrado en el flujo completo: contexto, generación, revisión humana, persistencia privada y pruebas automatizadas.

[i22remua/pmo-compass-ai](https://github.com/i22remua/pmo-compass-ai)

#SoftwareEngineering #GenerativeAI #ProjectManagement

## Video caption — English

From project notes to a saved report in PMO Compass AI. This demo shows a project, a weekly update and a risk register with source evidence. Built with Next.js, TypeScript, FastAPI and Firebase. Default generation uses deterministic templates; local Ollama is optional. Fictional data, reviewable drafts and a complete portfolio workflow.

## Texto para acompañar el vídeo — Español

De las notas del proyecto a un informe guardado con PMO Compass AI. La demo muestra un proyecto, un informe semanal y un registro de riesgos con evidencias. Desarrollado con Next.js, TypeScript, FastAPI y Firebase. La generación por defecto utiliza plantillas; Ollama local es opcional. Datos ficticios, borradores revisables y un flujo completo de portfolio.

## Recommended screenshots

| Order | Image | Focus |
| --- | --- | --- |
| 1 | [Product hero](screenshots/landing-hero-en.png) | Value proposition and source-to-document preview |
| 2 | [Dashboard](screenshots/dashboard-es.png) | Metrics, Demo Mode and projects |
| 3 | [Risk generator](screenshots/generator-risk-register.png) | Selected project, language, context, actual provider and source evidence |
| 4 | [Saved document](screenshots/saved-document-es.png) | A risk register reopened from history, with copy/export actions |
| 5 | [Dark dashboard](screenshots/dashboard-dark-es.png) or [mobile generator](screenshots/generator-mobile.png) | Theme consistency or responsive polish |

For a short carousel, use the first three. Crop tall images around readable content while retaining the actual provider label. Refresh the ten existing images with `npm run screenshots` while `npm run dev` is active. Screenshots use fictional examples, not real client results.

## Video script

The delivered recording uses the existing Relay project and Spanish captions. The bilingual **85-second narration below is an optional alternative** that includes creating a project; it is not a transcript of the shorter automated capture. Keep the provider label and one risk quote readable.

| Time | Screen action | English narration | Narración en español |
| --- | --- | --- | --- |
| 0–8s | Landing and example report | “Project updates start as scattered notes, risks and decisions. I built PMO Compass AI to turn that context into clear PMO documents.” | «Los informes empiezan como notas, riesgos y decisiones dispersas. He creado PMO Compass AI para convertir ese contexto en documentos PMO claros.» |
| 8–16s | Log in → Try the demo | “Firebase supports private accounts. This demo opens immediately with fictional projects and no account required.” | «Firebase permite usar cuentas privadas. Esta demo se abre directamente con proyectos ficticios y sin crear una cuenta.» |
| 16–25s | Dashboard and sector examples | “Projects, notes and saved documents share one workspace, with examples from technology, construction, events and logistics.” | «Proyectos, notas y documentos comparten un workspace, con ejemplos de tecnología, construcción, eventos y logística.» |
| 25–40s | Create a short logistics project | “I'll add a launch project with a delivery delay, an owner and a pending decision.” | «Voy a añadir un proyecto con un retraso, un responsable y una decisión pendiente.» |
| 40–54s | Generate a weekly status report | “The generator combines project context, document type, language and the purpose of this update.” | «El generador combina el contexto del proyecto, el tipo de documento, el idioma y el propósito de la actualización.» |
| 54–64s | Show report, copy and save | “Local templates produce the default draft. I review it, copy it and save this version.” | «Las plantillas generan el borrador por defecto. Lo reviso, lo copio y guardo esta versión.» |
| 64–76s | Generate a risk register | “Risk Radar links candidate risks to source evidence and proposes mitigations for review.” | «El radar vincula las señales de riesgo con evidencias y propone mitigaciones para revisar.» |
| 76–85s | Save and reopen history | “A portfolio project connecting Software Engineering, AI workflow design and Project Management.” | «Un proyecto de portfolio que conecta Ingeniería de Software, diseño de flujos de IA y Project Management.» |

Prepared project fields and notes are in [demo-script.md](demo-script.md#prepared-project-input). Rehearse with those values so typing does not dominate the recording. For a 60-second cut, start from the seeded Relay project and shorten the project-creation segment with a visible edit.

## Before publishing

- Verify that the final delivery commit is on `main` and its GitHub Actions run is green. The original public application baseline has already passed.
- Review the delivered MP4 once, then upload it natively. It contains Spanish captions and no narration or music. ES/EN subtitle files are included for editing.
- Link to the public source repository. Add a live-demo URL only after deployment is validated.
- Describe the default as templates, not live LLM inference. Ollama is optional; external adapters are future work.
- Use fictional notes and accounts. Do not show environment files, credential consoles or private project records.
- Keep measured productivity claims and real client results out of the post unless independently evidenced.

[Final delivery](final-delivery.md) · [Release checklist](release-checklist.md) · [GitHub setup](github-setup.md) · [Technical audit](final-audit.md) · [Deployment](deployment.md)
