# LinkedIn publication copy

Ready-to-publish text for the current public app. Screenshots were captured from the live site with fictional Starter Projects in an isolated browser. Gemini and Firebase were verified separately; screenshots of browser storage do not claim cloud persistence. Publishing this post on LinkedIn remains a manual step.

## Español

De una descripción breve a un primer borrador PMO listo para revisar.

Así funciona PMO Compass AI, el espacio de trabajo bilingüe que he desarrollado y que ya puedes probar online.

En dos minutos puedes recorrer un caso ficticio, ver las notas de origen y revisar un resultado. Desde ahí puedes generar con IA sin registro o crear tu propio proyecto:

- Explorar riesgos propuestos, información faltante y decisiones pendientes.
- Preguntar al Copilot y obtener respuestas concretas, como ordenar riesgos por impacto.
- Generar ocho tipos de documentos, copiarlos, descargarlos y guardarlos.

La aplicación utiliza Gemini en su nivel gratuito. Si la IA externa falla o agota su cuota, el Offline PMO Engine genera borradores mediante reglas y plantillas desde el backend. Las estimaciones se identifican y el contenido requiere revisión de un project manager.

Puedes explorar sin cuenta o registrarte para guardar proyectos y documentos privados entre dispositivos. La interfaz se centra en el trabajo: listas de proyectos, un selector de documento y detalles opcionales. Sin paneles decorativos ni explicaciones repetidas.

Me gustaría recibir feedback de quienes trabajan en gestión de proyectos: ¿qué documento o decisión os consume más tiempo?

App: https://pmo-compass-ai.vercel.app
Caso práctico: https://pmo-compass-ai.vercel.app/case-study
Código: https://github.com/i22remua/pmo-compass-ai

Desarrollado por Álvaro Redondo Muñoz con Next.js, TypeScript, FastAPI y Firebase.

#ProjectManagement #PMO #InteligenciaArtificial #FullStack

## English

From a short project description to a PMO draft ready for review.

That's the idea behind PMO Compass AI, the bilingual workspace I've built and made publicly available.

Explore a fictional case in two minutes, compare the source notes with a result, then generate with AI without signing up or create your own project:

- Explore proposed risks, missing information and pending decisions.
- Ask the Copilot focused questions, such as ranking risks by impact.
- Generate eight document types, then copy, download or save them.

The app uses Gemini's free tier. If external AI fails or reaches its quota, the Offline PMO Engine generates drafts through backend rules and templates. Estimates are labelled, and generated content requires a project manager's review.

Explore without an account, or register to save private projects and documents across devices. The interface focuses on the work: project lists, a document selector and optional details. No decorative dashboards or repeated explanations.

I'd welcome feedback from people working in project management: which document or decision takes up most of your time?

App: https://pmo-compass-ai.vercel.app
Walkthrough: https://pmo-compass-ai.vercel.app/case-study
Code: https://github.com/i22remua/pmo-compass-ai

Built by Álvaro Redondo Muñoz with Next.js, TypeScript, FastAPI and Firebase.

#ProjectManagement #PMO #ArtificialIntelligence #FullStack

## Recommended screenshots

Use these three images, in order:

1. [Product overview](screenshots/landing-hero-en.png).
2. [Source-to-result case](screenshots/case-study-es.png).
3. [Personal contribution](screenshots/contribution-es.png).

Optional: [dashboard](screenshots/dashboard-es.png), [document generator](screenshots/generator-risk-register.png) and [saved document](screenshots/saved-document-es.png). The interface in the saved-document image is Spanish; the example document is English. All project names, notes and people in these images come from fictional fixtures.

The [capture manifest](screenshots/capture-manifest.json) records the actual providers shown. Gemini is the configured live provider; Groq/OpenRouter are implemented alternatives that are not currently configured. Offline generation still requires the FastAPI backend. Application usage counters are process-local, not global across Vercel instances; do not advertise unlimited use or a globally enforced per-user allowance.

## Link preview and publishing

Share the **Live App** URL in either post. The website supplies a dedicated 1200 × 630 Open Graph image, title and description for link previews. The backend serves developers: its root opens API documentation and is not the product link.

Before publishing, paste the app URL into LinkedIn and check the preview. If LinkedIn still shows cached information, refresh the URL through [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/). Choose either the link card or the recommended screenshots. Actual LinkedIn rendering and publication must be checked from the owner’s account; preparing this file does not publish or edit a LinkedIn post.
