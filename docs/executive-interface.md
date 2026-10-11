# Dashboard y diagnóstico ejecutivo

Implementación y pruebas: 9 de octubre de 2026. Despliegue autorizado y realizado el 10 de octubre de 2026, junto con el [caso público y la navegación](case-navigation-interface.md#despliegue). La publicación conjunta posterior figura en la [auditoría final](visual-consistency-audit.md).

## Presentación

- Dashboard: cabecera «Panel de control» y «Nuevo proyecto»; acciones vencidas, riesgos altos y decisiones pendientes primero. Los proyectos en riesgo quedan en un segundo nivel, conservando su filtro.
- «Requieren atención»: título, proyecto, motivo y enlace directo. Mismo orden del motor PMO y cinco elementos iniciales, con acceso al resto. La cartera aparece después; documentos recientes y distribución de estados quedan desplegables al final.
- Estados vacíos: se distingue entre falta de seguimiento y ausencia de elementos que cumplan los criterios. Los criterios y límites de la evaluación siguen disponibles bajo demanda.
- Diagnóstico: «Situación actual», «Qué necesita atención» y «Qué hacer ahora». En escritorio, alertas y acciones se leen en columnas; en móvil, consecutivamente.
- Se muestra primero una conclusión de situación y hasta tres alertas o recomendaciones por grupo, respetando el orden original. El resto permanece accesible mediante «Ver más».
- Los textos largos se expanden; no se eliminan. Las etiquetas de procedencia se conservan y las evidencias incluyen origen, localización y texto completo. Causas, impacto y datos faltantes son desplegables.
- Las contradicciones siguen mostrando ambas evidencias y la comprobación sugerida. Cuando su explicación coincide literalmente con una alerta, esa explicación se muestra dentro del detalle para evitar repetirla en la vista inicial.
- Se conserva la revisión de propuestas, la apertura de registros existentes, los escenarios, la consulta, la actualización del análisis y sus estados de carga, error y desactualización.

## Alcance de los archivos

- `frontend/src/app/(workspace)/dashboard/page.tsx`: jerarquía, controles y secciones secundarias.
- `frontend/src/components/project-intelligence.tsx`: agrupación ejecutiva y detalles recuperables; el resumen del proyecto conserva su presentación anterior.
- `frontend/src/styles/workspace.css`: espaciado, filas, columnas y adaptación móvil usando los colores existentes.
- `frontend/src/locales/es.ts` y `en.ts`: textos equivalentes en ambos idiomas.
- `e2e/context.spec.ts`, `demo.spec.ts`, `error-states.spec.ts` y `firebase.spec.ts`: expectativas de presentación actualizadas; cobertura de límites, filtros, evidencias y accesibilidad.

`pmo-metrics.ts`, `use-project-analysis.ts`, los modelos, los proveedores, los prompts y las reglas de Firebase no se modifican. No hay nuevas dependencias.

## Validación y límites

TypeScript, ESLint y compilación de producción pasan en una copia aislada con los mismos fuentes y lockfile, utilizando Node 22. Las nuevas pruebas de interfaz verifican ES/EN, temas claro/oscuro, anchos de 375, 390 y 768 px, navegación por teclado, filtros y accesibilidad con axe. La prueba del diagnóstico compara sus conclusiones y evidencias con la respuesta real del motor local y abre los detalles para comprobar que no desaparecen datos ni clasificaciones.

Resultados finales:

- Suite general de Playwright: **51 pruebas superadas**.
- Integración con emuladores de Firebase Auth y Firestore: **4 pruebas superadas**.
- TypeScript, ESLint y compilación de producción: correctos.
- Formato, enlaces internos de documentación y `git diff --check`: correctos.

Los puertos y las rutas del entorno de pruebas se adaptaron únicamente en la copia de validación, sin cambiar la configuración del repositorio.

La lectura en menos de diez segundos es un objetivo de diseño, no una medición con usuarios. La versión se desplegó el 10 de octubre; no se han probado cuentas reales en esta validación. La validación visual y de navegador se realiza en Chromium; no incluye Safari ni Firefox.
