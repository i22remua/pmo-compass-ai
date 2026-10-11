# Revisión final de la interfaz

10 de octubre de 2026. Revisión conjunta del dashboard, diagnóstico, caso público y navegación, conservando la identidad visual. El usuario autoriza commit, push y despliegue del conjunto.

## Problemas y correcciones

- Etiquetas funcionales de 9–11 px en estados, fechas, procedencia, evidencias, advertencias y controles: pasan a 12 px mediante un token compartido. Se conservan los pequeños elementos de marca e índices decorativos. El tamaño mínimo es una decisión de legibilidad, no un requisito tipográfico de WCAG.
- «Dato aportado» aparecía en verde y «Inferencia IA» en terracota. Ambas clasificaciones y «Información insuficiente» usan ahora texto neutro y etiquetas explícitas: procedencia no equivale a salud ni a aprobación.
- Las evidencias referenciaban un token de superficie inexistente. Utilizan la superficie tenue existente, equivalente en ambos temas.
- Los encabezados del generador y documentos usan la familia sans-serif del workspace; la portada conserva sus titulares editoriales.
- Los detalles del caso público recuperan una altura mínima de 44 px. Los botones de icono deshabilitados dejan de mostrar el fondo de hover. Los botones compartidos permiten partir etiquetas largas.
- La auditoría de accesibilidad buscaba la antigua pestaña «Análisis». Utiliza el identificador estable de Diagnóstico y permite indicar `UI_BASE_URL` para validar servidores aislados.

No se cambian colores de la paleta, cálculos PMO, contratos, modelos, prompts, proveedores, almacenamiento, permisos ni controles App Check. No hay nuevas dependencias. Los avisos legales, privacidad, metodología, procedencia y revisión humana siguen accesibles.

## Archivos

La pasada final modifica `frontend/src/styles/tokens.css`, `workspace.css`, `marketing.css`, `scripts/audit-ui.mjs`, `playwright.config.ts` y añade `e2e/visual.spec.ts`. README, roadmap y documentación de diseño/entrega se actualizan.

El mismo commit integra las mejoras previas aún pendientes de publicar en Git: [dashboard y diagnóstico](executive-interface.md) y [caso público y navegación](case-navigation-interface.md). Esos documentos detallan componentes, traducciones y pruebas afectados.

## Validación

Se usa una copia aislada del código con el mismo lockfile y Node 22. Los puertos de prueba y rutas de Python se adaptan solo en esa copia para no interferir con servidores existentes. El formato y los controles de entrega/secretos se ejecutan también sobre el repositorio de trabajo.

- TypeScript, ESLint y build de producción correctos; 229 pruebas de API superadas.
- Suite general de interfaz: 61 pruebas superadas en una ejecución. Fallback/procedencia: dos pruebas adicionales superadas en servidor aislado.
- Auditorías npm y Python: sin vulnerabilidades conocidas notificadas.
- Matriz visual ES/EN × claro/oscuro × 375, 390, 768, 1024 y 1440 px: sin desbordamientos de página en portada, dashboard, diagnóstico, seguimiento, notas, documento, generador y ajustes/caso. También se abren formularios de proyecto con entradas largas.
- Generación local y descarga de los ocho formatos documentales en ambos idiomas. Los estados precalculado, en curso, error, respuesta externa simulada y proveedor utilizado tienen cobertura en la suite funcional.
- Diccionarios ES/EN con claves equivalentes. Auditoría axe: 36 combinaciones de ruta/tema sin infracciones de WCAG A/AA detectadas, más 24 comprobaciones móviles/escritorio en la matriz visual.
- Reglas Firestore: 22 pruebas. Integración Auth/Firestore: cuatro pruebas en emuladores.
- Pruebas del comprobador de entrega: cuatro superadas. Formato, enlaces de documentación y escaneo de secretos correctos.
- Se capturan comparaciones antes/después en 375 y 1440 px, ambos temas, para dashboard, diagnóstico, caso y documento. Archivos locales de revisión en `/private/tmp/pmo-ci-fix/test-results/visual-before/` y `visual-after/`; no se incluyen en el despliegue.

## Límites

Las pruebas de navegador se realizan en Chromium. No se repiten Safari/Firefox, dispositivos físicos, una auditoría manual integral con lector de pantalla, Gemini real ni persistencia con cuentas reales de producción. La integración privada se comprueba con emuladores. Axe no constituye una certificación de accesibilidad; los diez segundos de comprensión siguen siendo un objetivo pendiente de medir con usuarios.

El comportamiento existente del aviso de notas al recorrer el historial depende de Navigation API. No se modifica en esta entrega. Las tablas largas conservan desplazamiento dentro de su propio contenedor.
