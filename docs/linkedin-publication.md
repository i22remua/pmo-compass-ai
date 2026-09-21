# LinkedIn publication copy

Ready-to-publish text for the current public app. Screenshots were captured from the live site with fictional Starter Projects in an isolated browser. Gemini and Firebase were verified separately; screenshots of browser storage do not claim cloud persistence. Publishing this post on LinkedIn remains a manual step.

## Español

He publicado PMO Compass AI: un espacio de trabajo bilingüe para convertir el contexto de un proyecto en documentación PMO útil.

Puedes entrar desde el navegador y empezar con una descripción breve:

- Explorar riesgos propuestos, información faltante y decisiones pendientes.
- Preguntar al Copilot y obtener respuestas concretas, como ordenar riesgos por impacto.
- Generar ocho tipos de documentos, copiarlos, descargarlos y guardarlos.

La aplicación utiliza Gemini en su nivel gratuito. Si la IA externa falla o agota su cuota, el Offline PMO Engine genera borradores mediante reglas y plantillas desde el backend. Las estimaciones se identifican y el contenido requiere revisión de un project manager.

Puedes explorar sin cuenta o registrarte para guardar proyectos y documentos privados entre dispositivos. He simplificado la interfaz para dejar las acciones a la vista y los detalles disponibles cuando hacen falta.

Me gustaría recibir feedback de quienes trabajan en gestión de proyectos: ¿qué documento o decisión os consume más tiempo?

App: https://pmo-compass-ai.vercel.app
Código: https://github.com/i22remua/pmo-compass-ai

Desarrollado por Álvaro Redondo Muñoz con Next.js, TypeScript, FastAPI y Firebase.

#ProjectManagement #PMO #InteligenciaArtificial #FullStack

## English

I've launched PMO Compass AI: a bilingual workspace that turns project context into useful PMO documentation.

Open it in your browser and start with a short description:

- Explore proposed risks, missing information and pending decisions.
- Ask the Copilot focused questions, such as ranking risks by impact.
- Generate eight document types, then copy, download or save them.

The app uses Gemini's free tier. If external AI fails or reaches its quota, the Offline PMO Engine generates drafts through backend rules and templates. Estimates are labelled, and generated content requires a project manager's review.

Explore without an account, or register to save private projects and documents across devices. I've simplified the interface to keep actions visible and supporting details available when needed.

I'd welcome feedback from people working in project management: which document or decision takes up most of your time?

App: https://pmo-compass-ai.vercel.app
Code: https://github.com/i22remua/pmo-compass-ai

Built by Álvaro Redondo Muñoz with Next.js, TypeScript, FastAPI and Firebase.

#ProjectManagement #PMO #ArtificialIntelligence #FullStack

## Recommended screenshots

Use these three images, in order:

1. [Product overview](screenshots/landing-hero-en.png).
2. [Concise Copilot response](screenshots/copilot-ranked-risks-es.png).
3. [Project Intelligence](screenshots/project-intelligence-es.png).

Optional: [dashboard](screenshots/dashboard-es.png), [document generator](screenshots/generator-risk-register.png) and [saved document](screenshots/saved-document-es.png). The interface in the saved-document image is Spanish; the example document is English. All project names, notes and people in these images come from fictional fixtures.

The [capture manifest](screenshots/capture-manifest.json) records the actual providers shown. Gemini is the configured live provider; Groq/OpenRouter are implemented alternatives that are not currently configured. Offline generation still requires the FastAPI backend. Application usage counters are process-local, not global across Vercel instances; do not advertise unlimited use or a globally enforced per-user allowance.
