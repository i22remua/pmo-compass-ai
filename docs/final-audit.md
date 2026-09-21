# Auditoría técnica final — PMO Compass AI

> Historical record of the previous release. Current candidate behavior and test results are documented in [README](../README.md), [validation](VALIDATION.md) and [deployment](deployment.md).

**Fecha:** 13 de septiembre de 2026. **Conclusión:** el proyecto es demostrable y está preparado para presentarse como portfolio técnico, con las limitaciones indicadas. No se ha publicado ni desplegado. El despliegue público debe completar la configuración y las comprobaciones de entorno de la guía adjunta.

## Estado general

| Área | Evaluación | Evidencia y límites |
| --- | --- | --- |
| Arquitectura | Correcta para un MVP personal | Frontend, repositorio, API, modelos y proveedores separados; backend sin persistencia de proyectos |
| Seguridad de aplicación | Sin fallos críticos identificados en el alcance revisado | Tokens Firebase, reglas por propietario, invariantes de proyecto/documento, límites y rechazo de emuladores en producción |
| UX | Demostrable | Login honesto, demo visible, métricas calculadas, generador completo, historial, estados y temas ES/EN |
| Generación | Funcional | Ocho plantillas distintas, evidencias y preguntas pendientes; Ollama opcional con fallo/fallback controlados |
| Documentación | Completa | README en inglés, arquitectura, esquema, IA, roadmap, demo script, despliegue y kit de publicación |
| Pruebas | Pasan | 95 API/proveedores, 8 navegador demo, 2 fallback, 3 Firebase, 9 reglas, 18 análisis axe, lint, tipos y build |
| Dependencias | Correcciones aplicadas; deuda de herramientas pendiente | 0 vulnerabilidades conocidas de producción npm y 0 en el entorno Python auditado; 9 avisos moderados en herramientas npm de desarrollo |
| Publicación | Preparada localmente | Capturas y textos listos; faltan repositorio remoto, elección de licencia, ejecución real de CI y URL desplegada |

Esta revisión combina inspección de código, búsqueda de patrones de credenciales, auditorías de dependencias, pruebas de navegador/emuladores y revisión visual. No es una certificación de seguridad ni una auditoría de infraestructura cloud.

## Problemas encontrados y cambios realizados

| Prioridad | Hallazgo | Resolución |
| --- | --- | --- |
| Alta, condicionada a una configuración incorrecta | `APP_ENV=production` exigía Firebase, pero no rechazaba variables de emulador. El SDK Admin acepta tokens de prueba sin firma cuando se configura ese emulador. | El backend rechaza `FIREBASE_AUTH_EMULATOR_HOST` y `FIRESTORE_EMULATOR_HOST` en producción. Next.js rechaza su flag de emulador al construir producción. Añadidas pruebas de rechazo y de configuración válida. |
| Media | `.gitignore` no cubría todos los nombres habituales de entornos y claves privadas. | Añadidos `.env.*`, patrones Firebase Admin, `.pem` y `.key`; se conservan los `.env.example`. |
| Media | Auditoría Python: aviso en pydantic-settings 2.13.1 y aviso duplicado sobre pytest 9.0.2. | Actualizados a 2.14.2 y 9.0.3; segunda auditoría sin vulnerabilidades conocidas. La app no utiliza la fuente de secretos anidados afectada, pero se actualizó igualmente. |
| Media | npm reportaba 11 paquetes afectados en la cadena de herramientas de desarrollo. | Un override limitado a Express → qs elimina dos avisos, con lockfile actualizado y pruebas repetidas. Quedan nueve, descritos abajo. |
| Baja | Una prueba Firebase comprobaba textos de estados vacíos retirados durante un cambio visual anterior. | Usa los textos actuales del diccionario; vuelve a pasar el flujo completo, sin eliminar comprobaciones funcionales. |
| Baja | Ejemplos anteriores sin los sectores Event y Logistics ni carga aditiva para visitantes recurrentes. | Añadidos Summit y Relay en ES/EN; cargar ejemplos ausentes conserva proyectos editados y documentos propios. |
| Baja | README mayoritariamente en español y presentación técnica incompleta para GitHub/LinkedIn. | README profesional en inglés y documentación específica, guion, capturas y publicaciones listas para adaptar con enlaces reales. |
| Operativa | El entorno local usa Node 20, una rama fuera de soporte para un nuevo despliegue. | `.nvmrc` recomienda Node 22 y la guía exige una versión LTS soportada. CI ya usa 22; se conserva la compatibilidad local existente. |

El comportamiento de tokens de emulador está documentado por [Firebase](https://firebase.google.com/docs/emulator-suite/connect_auth). El estado de soporte de Node se contrasta con la [tabla oficial de versiones](https://nodejs.org/en/about/previous-releases).

## Seguridad y aislamiento de datos

No se encontraron claves privadas ni tokens de proveedor en los archivos publicables revisados mediante patrones. Las configuraciones locales comprobadas tampoco contienen una API key Firebase configurada. **Los ejemplos de entorno contienen nombres, valores por defecto o placeholders; los secretos reales nunca deben copiarse a `.env.example`.**

No había directorio `.git` ni remoto en el workspace: no existe historial local que haya podido auditarse. La búsqueda de patrones no demuestra que cualquier archivo arbitrario futuro esté libre de secretos. Antes del primer commit conviene revisar el listado exacto que se va a publicar.

Las reglas Firestore protegen cada perfil, proyecto y documento por UID. Las consultas incluyen `ownerId`, las escrituras impiden cambiar propietario/fecha de creación y un documento nuevo requiere un proyecto activo del mismo usuario. Los documentos guardados son inmutables, salvo reintentos idénticos. El borrado del proyecto usa una marca y lotes de hijos antes de eliminar el padre.

Las pruebas con emuladores verifican cuentas separadas y accesos a URLs ajenas, además de reglas directamente. También comprueban que entrar en demo, restablecerla y volver a la cuenta no modifica los proyectos cloud. La demo usa localStorage; no es un mecanismo de autenticación o privacidad para personas que comparten un perfil de navegador.

Markdown omite HTML e imágenes remotas, y sanitiza los enlaces. La API valida entradas, limita el tamaño del cuerpo y las peticiones, verifica tokens donde corresponde y no persiste las notas. Los errores controlados no devuelven el cuerpo original. No hay SDK de pago ni claves de proveedor externas en el producto.

## Dependencias: qué queda pendiente

Después de las correcciones:

- `npm audit --omit=dev`: **0** vulnerabilidades conocidas.
- Auditoría completa npm: **9 avisos moderados de paquetes**, sin altos ni críticos, dentro de herramientas de desarrollo/Firebase CLI. Algunos son avisos heredados por paquetes dependientes; no equivalen a nueve fallos independientes del producto.
- Auditoría del entorno Python instalado: **56 paquetes, 0 vulnerabilidades conocidas**.
- `pip check`: sin incompatibilidades.

Paquetes señalados por npm: `@google-cloud/pubsub`, `@opentelemetry/core`, `csv-parse`, `firebase-tools`, `gaxios`, `re2`, `stream-json`, `universal-analytics` y `uuid`.

La eliminación de todos exige revisar actualizaciones mayores/upstream y el runtime de herramientas nativas. La versión corregida de re2 consultada requiere Node 22.22.2 o posterior dentro de las ramas que admite; no se forzó su instalación sobre el Node 20 local. Tampoco se aplicó la propuesta automática de degradar Firebase CLI a una versión mayor antigua. La siguiente tarea de mantenimiento debe actualizar y probar esa cadena en Node 22, evitando exponer herramientas/emuladores de desarrollo a entradas externas.

Fuentes de los avisos principales: [OpenTelemetry](https://github.com/advisories/GHSA-8988-4f7v-96qf), [csv-parse](https://github.com/advisories/GHSA-8cw4-87c7-c6xx), [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [stream-json](https://github.com/advisories/GHSA-528h-pc64-c93x), [re2](https://github.com/advisories/GHSA-j4r3-hg7j-8chg).

No hay un lock completo de dependencias transitivas Python; las dependencias directas sí están fijadas. Permanecen dos warnings de deprecación del cliente de pruebas Starlette. Ninguno provoca fallos, pero deben tratarse en mantenimiento.

## Arquitectura, UX e IA

La estructura resulta coherente con el tamaño del producto. La UI no incorpora SDKs de IA ni prompts; el backend no mezcla generación con consultas Firestore. Se mantienen nombres de dominio estables y diccionarios ES/EN con paridad tipada. Las guías nuevas usan nombres descriptivos en minúsculas; `ROADMAP.md` conserva un enlace para referencias anteriores.

El dashboard ofrece métricas de datos guardados, acceso a demo y proyectos/documentos recientes. Sus señales de riesgo son candidatos del último documento de cada proyecto, no un registro de riesgos con ciclo de vida. El generador muestra proyecto, tipo, idioma, contexto, notas de origen, carga/cancelación, documento formateado, proveedor real y acciones de copiar/guardar/exportar.

DemoAIProvider produce estructuras distintas por documento y señales vinculadas a la fuente. Las nuevas pruebas verifican los ejemplos bilingües y su reproducción. No es un LLM ni traduce semánticamente las citas. Ollama valida estructura/finalización/evidencia y ofrece fallback explícito; ExternalAIProvider mantiene el contrato con un error 501 hasta implementar su transporte.

Como evolución, separar más plantillas cuando crezcan, añadir paginación, versionado, recuperación de acceso y cuotas compartidas resulta razonable. Esas necesidades están en el roadmap; no se reescribió una arquitectura funcional durante esta auditoría.

## Pruebas y límites de verificación

Todas las suites indicadas en [VALIDATION.md](VALIDATION.md) pasan tras las correcciones. El build de producción, los tipos, lint y formato también pasan. Los 18 análisis axe y las capturas cubren ambas apariencias; el test responsive comprueba 320, 768, 1024 y 1440 px.

Firebase se ha probado con emuladores locales, no con credenciales de producción. Ollama tiene contratos probados con mocks y fallo de conexión real, pero no se ha ejecutado una inferencia con un modelo instalado. No se ha probado una infraestructura publicada, una ejecución remota de GitHub Actions o navegadores distintos de Chromium. La accesibilidad automatizada no sustituye la revisión completa con teclado y lector de pantalla.

## Archivos creados y modificados

| Grupo | Archivos |
| --- | --- |
| Documentación nueva | `docs/ai-strategy.md`, `database-schema.md`, `product-roadmap.md`, `demo-script.md`, `deployment.md`, `publication-kit.md`, `final-audit.md` |
| Documentación reorganizada | `README.md`, `docs/architecture.md` (antes `ARCHITECTURE.md`), `docs/ROADMAP.md`, `docs/VALIDATION.md` |
| Demo y presentación | `frontend/src/components/demo-guide.tsx` (nuevo), landing, dashboard, generador, diccionarios EN/ES, estilos marketing/workspace, repositorio y fixtures demo |
| Utilidades | `scripts/seed-demo.mjs` (nuevo), `scripts/seed-demo.py`, comando `seed:demo` y las diez capturas de `docs/screenshots/` |
| Seguridad/configuración | `.gitignore`, `.nvmrc` (nuevo), `frontend/next.config.ts`, `backend/app/config.py`, requirements, `package.json` y `package-lock.json` |
| Verificación | `backend/tests/test_demo_fixtures.py` (nuevo), `test_api.py`, E2E demo/Firebase y `.github/workflows/ci.yml` |

No se han eliminado tipos de documento, proveedores, operaciones de proyectos ni flujos de persistencia. `AI_PROVIDER=demo` continúa como valor por defecto.

## Ejecutar localmente

```bash
npm run setup
npm run dev
```

Abrir `http://localhost:3000` y pulsar **Probar la demo**. API interactiva: `http://localhost:8000/docs`.

Si utilizas nvm, `.nvmrc` selecciona Node 22: instala esa rama si no la tienes y usa `nvm use` antes del setup. El proyecto conserva su mínimo histórico Node 20.19 para el entorno local existente, pero no se recomienda para producción.

`npm run seed:demo` reconstruye los documentos de ejemplo del código. Para añadir los nuevos sectores a una demo anterior, usa **Vista general → Modo demo → Cargar ejemplos que faltan**. Para empezar de cero, Configuración ofrece un reset local con confirmación.

## Pasos recomendados para desplegar

1. Preparar un repositorio GitHub, elegir licencia y revisar los archivos del primer commit. Ejecutar CI con Node 22.
2. Crear/configurar Firebase Auth y Firestore; desplegar reglas e índices del proyecto.
3. Desplegar FastAPI como servicio Python con HTTPS, `APP_ENV=production`, `AUTH_MODE=firebase`, `AI_PROVIDER=demo`, credenciales server-only y CORS limitado al frontend.
4. Desplegar Next.js en un host compatible, con la URL HTTPS de la API y configuración web Firebase. Mantener todos los emuladores desactivados.
5. Comprobar en el entorno publicado generación, guardado, login, dos usuarios, responsive y cambio demo/cuenta.
6. Añadir la URL real al README y grabar el vídeo con datos ficticios.

La [guía de despliegue](deployment.md) contiene comandos, variables y referencias oficiales. No es necesario desplegar Ollama para presentar el producto.

## GitHub y LinkedIn

El [kit de publicación](publication-kit.md) incluye **los textos finales completos en inglés y español**, descripción corta de GitHub, topics y plan de capturas. El [guion de demo](demo-script.md) propone una grabación de 85 segundos con texto listo para pegar.

Capturas prioritarias: hero, dashboard con demo/métricas, generador de riesgos con proveedor/evidencia y documento reabierto. Un quinto plano móvil u oscuro muestra el acabado responsive. Las diez imágenes existentes ya se han regenerado desde la aplicación.

La publicación debe presentarlo como portfolio funcional con plantillas por defecto, proveedor local opcional y Firebase validado con emuladores. Deben permanecer claros los límites actuales y evitar afirmaciones de ahorro medido, clientes reales o despliegues que aún no se han verificado.

## Cierre como release candidate

La preparación final mantiene la aplicación y sus proveedores. Se han completado los ejemplos de entorno, ampliado las exclusiones de archivos privados/generados y añadido comprobaciones automáticas de enlaces, anchors, nombres de archivo, contenido publicable y secretos en el índice de Git. Cuatro pruebas de estas comprobaciones pasan, junto con toda la batería de aplicación documentada en [VALIDATION.md](VALIDATION.md).

La [checklist de release](release-checklist.md) registra el cierre local y los pasos pendientes. Las instrucciones para el primer commit, repositorio público y etiqueta candidata están en [github-setup.md](github-setup.md). Las publicaciones completas/cortas EN/ES, captions y guion bilingüe están en [linkedin-publication.md](linkedin-publication.md).

No se ha creado el repositorio remoto ni grabado/subido el vídeo. Los archivos de entorno locales están excluidos de la publicación; las plantillas son las únicas configuraciones destinadas al repositorio. Se mantienen visibles los nueve avisos moderados de herramientas de desarrollo, la validación Firebase con emuladores y la ausencia de una inferencia Ollama real.

## Preparación posterior del commit público

La preparación de GitHub inicializa Git local en `main` y apunta al repositorio previsto `i22remua/pmo-compass-ai`. Se excluyen los tipos generados de Next.js, se regeneran antes de TypeScript y se corrige la dependencia de la fecha actual en dos pruebas de snapshots. Las funcionalidades y los proveedores no cambian. La verificación actual y los pasos de commit/remote se registran en [VALIDATION.md](VALIDATION.md) y [release-checklist.md](release-checklist.md). El push requiere confirmación del propietario; no se realiza automáticamente.

## Entrega final y revisión de GitHub

El repositorio público `i22remua/pmo-compass-ai` y la etiqueta `v0.1.0-rc1` contienen el commit revisado `443dd0a`; GitHub Actions ha terminado correctamente para esa versión. La revisión en navegador confirma que las imágenes del README cargan. La descripción es correcta y faltan los topics. Esta evidencia sustituye el estado inicial sin publicación descrito en las secciones históricas.

Se prepara un commit posterior con documentación actualizada, acciones de CI compatibles con Node 24 y una grabación real de unos 83 segundos en español, con subtítulos y capturas. El pack, los textos listos para publicar y la comprobación de la versión remota se describen en [final-delivery.md](final-delivery.md). Las funcionalidades permanecen iguales. El nuevo push y su validación remota siguen pendientes de confirmación del propietario.
