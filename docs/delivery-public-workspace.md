# Entrega del workspace público

**Actualizado el 22 de septiembre de 2026. Estado: workspace público desplegado en Vercel.** El propietario ha autorizado el commit, el push y la actualización del material de LinkedIn. El despliegue se ha realizado directamente desde el código local tras tu petición de completar lo pendiente.

## 1. Cambios realizados

Caso práctico público desde la portada, generación sin registro sobre datos ficticios y página de aportación personal. Entrada desde Crear mi proyecto a un workspace vacío, creación desde descripción mínima, Starter Projects opcionales, ocho documentos bilingües con trazabilidad, AI Project Intelligence, PMO Copilot, proveedor real visible/guardado, fallback automático, límites por IP/usuario, controles free-only y preparación de despliegue público. Se conservan las funciones de edición, notas, copia, descarga, historial y persistencia separada local/Firebase. El lenguaje de producto sustituye al enfoque de demo; identificadores internos y registros antiguos siguen compatibles.

## 2–3. Archivos creados y modificados

Al final aparece el inventario de la entrega inicial del 21 de septiembre; los cambios posteriores y sus pruebas se documentan en [VALIDATION](VALIDATION.md). Incluye el código ya presente al iniciar esta revisión y las correcciones realizadas para dejarlo integrado. No se han añadido dependencias.

## 4–6. Proveedores, variables y valor por defecto

Implementados: GeminiProvider, GroqProvider, OpenRouterProvider y OfflinePMOProvider. Se conserva OllamaAIProvider y la compatibilidad con nombres antiguos.

Por defecto: `AI_PROVIDER=auto`, orden `gemini,groq,openrouter,offline`, `AI_COST_MODE=free_only`.

Variables nuevas: `AI_PROVIDER_ORDER`, `AI_COST_MODE`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FREE_TIER_CONFIRMED`, `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_FREE_TIER_CONFIRMED`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `EXTERNAL_AI_TIMEOUT_SECONDS`, `FREE_AI_DAILY_LIMIT_PER_USER` y `FREE_AI_RATE_LIMIT_PER_MINUTE`. Las URL `PUBLIC_FRONTEND_URL` y `PUBLIC_BACKEND_URL` parametrizan smoke:public; el navegador utiliza `NEXT_PUBLIC_API_URL`.

Groq usa `openai/gpt-oss-20b`: el modelo Llama solicitado figura actualmente como Enterprise, mientras GPT-OSS 20B figura en la tabla gratuita. [Fuentes y configuración](deployment.md#free-tier-external-ai). Las confirmaciones free-tier reflejan configuración de la cuenta; el código no puede inspeccionar su facturación.

## 7. Probar IA externa gratuita

Gemini ya está configurado y una llamada real devuelve `provider=gemini`. Para reproducir la configuración en otro entorno, utilizar `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.1-flash-lite`, `GEMINI_FREE_TIER_CONFIRMED=true`. Reiniciar el backend y generar con datos ficticios. Verificar que el documento indica `gemini`: ver `auto` en health no demuestra una llamada real. Las instrucciones completas para los tres proveedores están en [deployment](deployment.md). No introducir keys en el frontend.

## 8. Probar fallback offline

Sin keys, `auto` termina en OfflinePMOProvider y muestra el aviso de fallback. También puedes pulsar **Offline PMO Engine** en el generador para omitir cualquier llamada externa. Los errores de cuota/red/modelo se verifican con mocks y el fallo real de conexión local en test:providers. El motor no necesita un LLM externo; sí necesita que FastAPI responda.

## 9–12. URL pública, configuración pendiente y acceso desde LinkedIn

URL frontend pública: https://pmo-compass-ai.vercel.app

URL backend pública: https://pmo-compass-ai-api.vercel.app

Ambas URL están desplegadas en Vercel Hobby. `smoke:public` pasa contra los servicios reales: landing, entrada, health, CORS, riesgos inferidos y protección del endpoint privado. Ya se puede entrar desde LinkedIn sin instalar nada y usar el workspace con generación offline.

Firebase `pmo-compass-ai-2026` está creado sin facturación. Firestore y sus reglas/índices están desplegados. El backend tiene una identidad propia con permiso limitado `firebaseauth.users.get`; la credencial se guarda fuera del repositorio y como variable sensible del backend de Vercel.

Authentication y Correo electrónico/contraseña están activados, el dominio público está autorizado y el frontend usa Firebase. Se ha probado el registro real, el guardado de proyectos/documentos, la recuperación en un navegador nuevo y el aislamiento entre dos cuentas. No se ha activado facturación.

La clave de Gemini está guardada como variable sensible exclusivamente en el backend. Se ha cambiado a `gemini-3.1-flash-lite` tras observar HTTP 404 con el modelo 2.5 en este proyecto. Gemini ya genera documentos reales y el fallback offline se conserva. Groq/OpenRouter son alternativas opcionales sin configurar. Render ya no es necesario para este despliegue y queda como alternativa documentada. Los límites en memoria son por instancia, no globales entre funciones de Vercel; antes de basarse en cuotas agregadas de IA externa se requiere un limitador compartido.

## 13. Secretos

Se ha creado una credencial de servicio dedicada y almacenado únicamente fuera del repositorio y en el backend de Vercel como secreto sensible. No se han añadido credenciales a Git ni expuesto claves privadas al navegador. Los ejemplos dejan las keys vacías y los entornos privados están excluidos de Git. La revisión de patrones de archivos publicables/índice pasa; esto no equivale a una auditoría exhaustiva del historial completo o de cuentas externas.

## 14. Verificación

[Resultados completos](VALIDATION.md): 168 pruebas backend, 9 E2E, 2 proveedores, 15 reglas, 3 Firebase y 4 herramientas de release; 18 análisis de accesibilidad sin incidencias. Build, lint, TypeScript, formato y checks de release pasan. Smoke local con el build de producción pasa. Smoke público: pasa contra las URL reales. Login Firebase, persistencia/aislamiento real, sesiones revocadas/eliminadas y generación Gemini: verificados. Un registro de riesgos en español generado por Gemini se guardó, recargó y comprobó directamente en Firestore con `provider=gemini`. Las cuentas temporales y sus datos se eliminaron. Dos avisos de deprecación del entorno de tests permanecen.

## 15. Publicación Git autorizada

```bash
git status --short
git diff --check
npm run check:release
# Revisar y seleccionar los archivos de esta entrega.
git add -p
# Añadir explícitamente los archivos nuevos revisados que figuran en el inventario.
git diff --cached --stat
git diff --cached
npm run check:release
git commit -m "Prepare public PMO workspace with free-tier AI and offline fallback"
git push origin HEAD
```

La revisión previa al commit comprueba el índice y excluye `.env`, credenciales y archivos de salida privados. La autorización incluye commit y push, pero la publicación del post en LinkedIn queda a cargo del propietario.

## 16. Publicación LinkedIn

[Texto completo actualizado en español e inglés](linkedin-publication.md). Incluye ambas URL, los proveedores free-tier, el Offline PMO Engine y revisión humana. El texto describe el login y Gemini ya disponibles, el motor offline y las alternativas opcionales.

## Corrección del Copilot tras la revisión

El Copilot responde a la pregunta concreta sin generar un resumen ejecutivo ni añadir anexos al texto. Si se pide ordenar riesgos, Gemini usa impacto descendente y etiqueta las estimaciones. Los supuestos y avisos se consultan en un desplegable y no se incluyen al copiar. El motor offline reconoce si carece de impactos valorados para ordenarlos. Se conservan los documentos completos del generador.

## Primera simplificación de pantallas (medición histórica)

Antes del rediseño editorial y del caso práctico, la primera simplificación redujo las palabras de la landing un 48 % menos de palabras; el dashboard con ejemplos, un 26 %; el generador, un 17 %; y AI Project Intelligence, un 32 %. Comparación de la interfaz en español, mismo contenido y desplegables cerrados. Se han quitado textos repetidos y trasladado la explicación de IA, almacenamiento, formatos y tecnología a `/about`, accesible desde el pie de la landing, Configuración y los avisos de privacidad. La descripción del proyecto queda en Resumen y las razones del análisis se consultan bajo demanda. No se han recortado datos del proyecto ni documentos generados.

Nueve pruebas E2E y cuatro comprobaciones adicionales de accesibilidad pública pasan. La página Acerca de se ha revisado en español/inglés y móvil/escritorio.

## Material final de LinkedIn

Se han actualizado 15 capturas desde la URL pública, con datos ficticios y sin cuentas privadas. El registro de riesgos y el Copilot muestran Gemini; la captura móvil del generador muestra el motor offline. El manifiesto registra los proveedores reales. Los textos español/inglés y el orden recomendado de imágenes están en [la publicación](linkedin-publication.md) y [el kit](publication-kit.md). El vídeo anterior es histórico y no se ha renovado. El post está preparado para publicación manual.

## Cómo revisar ahora

Abrir https://pmo-compass-ai.vercel.app → Comenzar. Crear un proyecto con “Proyecto para implantar un ERP en una empresa industrial durante cuatro meses.” Abrir AI Project Intelligence, probar Copilot y generar un registro de riesgos. Cambiar ES/EN, guardar, copiar y descargar. Añadir Starter Projects si se quieren explorar otros sectores. No hace falta instalar nada ni iniciar servicios locales.

Sin iniciar sesión, el guardado persiste en ese navegador. Con una cuenta, los proyectos y documentos se guardan en Firestore y se recuperan desde otro navegador. Los borradores locales no se importan automáticamente.

## Archivos nuevos

- `.vercelignore`
- `backend/.dockerignore`
- `backend/.gitignore`
- `backend/.vercelignore`
- `backend/Dockerfile`
- `backend/app/providers/gemini.py`
- `backend/app/providers/groq.py`
- `backend/app/providers/offline.py`
- `backend/app/providers/openrouter.py`
- `backend/app/providers/remote.py`
- `backend/app/providers/risk_catalog.py`
- `backend/app/services/__init__.py`
- `backend/app/services/inference.py`
- `backend/app/services/provenance.py`
- `backend/tests/test_free_providers.py`
- `backend/vercel.json`
- `docs/delivery-public-workspace.md`
- `docs/public-live-checklist.md`
- `docs/screenshots/capture-manifest.json`
- `docs/screenshots/copilot-ranked-risks-es.png`
- `docs/screenshots/project-intelligence-es.png`
- `frontend/src/app/about/page.tsx`
- `frontend/src/app/start/page.tsx`
- `frontend/src/components/project-intelligence.tsx`
- `render.yaml`
- `scripts/smoke-public.mjs`

## Archivos modificados

- `.env.example`
- `README.md`
- `backend/.env.example`
- `backend/app/api/auth.py`
- `backend/app/api/routes.py`
- `backend/app/config.py`
- `backend/app/main.py`
- `backend/app/models/generation.py`
- `backend/app/providers/blueprints.py`
- `backend/app/providers/demo.py`
- `backend/app/providers/factory.py`
- `backend/app/providers/ollama.py`
- `backend/app/providers/prompts.py`
- `backend/app/providers/service.py`
- `backend/tests/conftest.py`
- `backend/tests/test_api.py`
- `backend/tests/test_demo_fixtures.py`
- `backend/tests/test_providers.py`
- `docs/VALIDATION.md`
- `docs/ai-strategy.md`
- `docs/architecture.md`
- `docs/database-schema.md`
- `docs/demo-script.md`
- `docs/deployment.md`
- `docs/final-audit.md`
- `docs/final-delivery.md`
- `docs/github-setup.md`
- `docs/linkedin-publication.md`
- `docs/product-roadmap.md`
- `docs/publication-kit.md`
- `docs/release-checklist.md`
- `docs/screenshots/dashboard-dark-es.png`
- `docs/screenshots/dashboard-es.png`
- `docs/screenshots/dashboard-mobile.png`
- `docs/screenshots/generator-dark-risk-register.png`
- `docs/screenshots/generator-mobile.png`
- `docs/screenshots/generator-risk-register.png`
- `docs/screenshots/landing-dark-en.png`
- `docs/screenshots/landing-en.png`
- `docs/screenshots/landing-hero-en.png`
- `docs/screenshots/landing-mobile.png`
- `docs/screenshots/saved-document-es.png`
- `e2e/demo.spec.ts`
- `e2e/firebase.spec.ts`
- `e2e/providers.spec.ts`
- `firebase/firestore.rules`
- `firebase/tests/rules.test.mjs`
- `frontend/next.config.ts`
- `frontend/src/app/(workspace)/dashboard/page.tsx`
- `frontend/src/app/(workspace)/documents/[id]/page.tsx`
- `frontend/src/app/(workspace)/generator/page.tsx`
- `frontend/src/app/(workspace)/projects/[id]/page.tsx`
- `frontend/src/app/(workspace)/settings/page.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/components/app-shell.tsx`
- `frontend/src/components/demo-guide.tsx`
- `frontend/src/components/project-form.tsx`
- `frontend/src/components/providers.tsx`
- `frontend/src/components/ui.tsx`
- `frontend/src/components/workspace-provider.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/demo-documents.json`
- `frontend/src/lib/repository.ts`
- `frontend/src/locales/en.ts`
- `frontend/src/locales/es.ts`
- `frontend/src/styles/workspace.css`
- `frontend/src/types/index.ts`
- `package.json`
- `scripts/audit-ui.mjs`
- `scripts/check-release.mjs`
- `scripts/record-demo.mjs`
- `scripts/screenshots.mjs`
- `scripts/seed-demo.py`
