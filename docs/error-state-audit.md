# Auditoría de errores y estados vacíos

Revisión del 8–9 de octubre de 2026. Cambios locales listos para revisión; **sin commit, push ni despliegue**. Las pruebas utilizan datos ficticios. No se han cambiado reglas de Firebase, controles de seguridad ni dependencias.

| Escenario | Fallo reproducido | Corrección y archivos modificados | Prueba y resultado |
| --- | --- | --- | --- |
| 1. Proyecto sin nombre | Sí | Título basado en una cláusula legible, máximo 80 caracteres y editable. `frontend/src/lib/format.ts`, `frontend/src/components/project-form.tsx`. | Descripción del portal de clientes, edición, recarga, abreviaturas y texto largo: pasan. |
| 2. Información insuficiente | Sí | Se elimina el riesgo genérico que aparecía sin evidencia. Causas e impacto usan `insufficient` cuando faltan señales; se solicitan datos. `backend/app/services/inference.py`, `backend/app/services/diagnosis.py`. | Cuatro pruebas nuevas de backend y diagnóstico ES/EN en navegador: pasan. Se conserva la detección de riesgos respaldados por contexto. |
| 3. Proveedor no disponible | No | El fallback y la procedencia ya funcionan; sin cambios en proveedores. | Dos pruebas ES/EN con Ollama inaccesible verifican motor alternativo y procedencia guardada. Las pruebas de backend cubren errores externos y privacidad. Pasan. |
| 4. Persistencia sin sesión | No | El almacenamiento existente conserva proyectos y carga ejemplos de forma aditiva; sin cambios en repositorio. | Creación, recarga, ejemplos y fallo simulado de cuota: pasan. El fallo al guardar notas mantiene los datos anteriores y el borrador. |
| 5. Navegación móvil | No | Se conserva la navegación y el diseño existentes. | Diagnóstico, Seguimiento, Fuentes, Notas y Documentos a 375, 390 y 768 px, ES/EN, controles etiquetados, teclado y ausencia de desbordamiento en las vistas probadas: pasan. |
| 6. Registros duplicados | Sí | `matchingRecord` ahora protege también el registro manual y la edición, respetando propietario, proyecto y tipo. Excluye el propio registro editado y enlaza al existente. `frontend/src/components/project-tracking.tsx`. | Duplicado normalizado bloqueado, enlace al registro existente y títulos similares distintos permitidos: pasan. Las pruebas existentes de propuestas siguen pasando. |
| 7. Notas sin guardar | Sí | Confirmación para guardar, descartar o seguir editando; borrador conservado ante error. Protección de enlaces, secciones, salida de sesión y navegación compatible. `frontend/src/hooks/use-unsaved-notes.ts`, `frontend/src/app/(workspace)/projects/[id]/page.tsx`, `frontend/src/components/app-shell.tsx`, `frontend/src/locales/es.ts`, `frontend/src/locales/en.ts`. | Las tres opciones, error de almacenamiento, navegación atrás y cancelación de recarga nativa: pasan. No se muestra aviso con notas sin cambios. |
| 8. Eliminación y asociados | No en los recorridos comprobados | La eliminación en cascada y su mecanismo recuperable existentes se conservan; sin cambios en repositorio ni reglas. | Eliminación local y en emuladores con documentos, fuentes, registros y revisión; persistencia y aislamiento entre cuentas: pasan. No se ha provocado una interrupción de borrado en Firebase real. |

## Verificación

- Backend: **229 pruebas pasan**. Se mantiene una advertencia de deprecación de la integración FastAPI/Starlette/httpx.
- Playwright principal: **49 casos distintos verificados** entre ejecución general y repeticiones dirigidas. La primera ejecución tuvo 45 aciertos y tres fallos: una expectativa dependía del riesgo genérico eliminado y se corrigió su fixture añadiendo contexto ERP; los otros dos fueron un timeout de compilación y un conflicto de artefactos entre ejecuciones. Los tres pasaron al repetirlos por separado. Después pasó el caso adicional de límites del título. No se presenta esto como una única ejecución de 49 casos sin fallos.
- Integración Firebase: **4 pruebas pasan con emuladores** de Auth y Firestore; no equivalen a validación de producción.
- Proveedores: **2 pruebas pasan** con un proveedor inaccesible y fallback real al motor interno; no se probó inferencia con un Ollama activo.
- TypeScript, ESLint y compilación de producción: pasan sobre el código final.
- Formato, enlaces internos de documentación y `git diff --check`: pasan.

Los archivos de dependencias del directorio original estaban parcialmente descargados por iCloud y bloqueaban las herramientas. TypeScript, ESLint y build se ejecutaron en una copia temporal con los mismos fuentes, configuración y `package-lock.json`, instalando mediante `npm ci`. Las integraciones Firebase y proveedores utilizaron esa copia; el backend utilizó un entorno Python temporal con los requisitos del repositorio. No se copiaron credenciales ni se cambiaron las dependencias del proyecto. Las comprobaciones principales se realizaron el 8 de octubre y la validación final y documentación se cerraron el 9.

Pruebas añadidas: [estados de error en navegador](../e2e/error-states.spec.ts) y [contexto insuficiente](../backend/tests/test_insufficient_context.py). Pruebas ajustadas: [flujo del espacio local](../e2e/demo.spec.ts), [contexto](../e2e/context.spec.ts) y su inclusión en [Playwright](../playwright.config.ts).

## Límites pendientes

- Navegadores: Chromium verificado; Firefox y Safari no ejecutados. La protección de atrás/adelante dentro de la aplicación depende de que el navegador admita eventos cancelables de Navigation API. En navegadores anteriores se mantienen los avisos de enlaces, secciones y descarga de página.
- Recargar o cerrar utiliza el aviso nativo del navegador: permite quedarse o salir, no las tres opciones del diálogo de la aplicación. El navegador puede limitar cuándo muestra ese aviso.
- Los duplicados se detectan entre registros cargados, por texto normalizado. No se añade unicidad transaccional entre dispositivos ni comparación semántica.
- No se han probado llamadas reales a Gemini/Groq/OpenRouter, fallos inducidos de borrado en la nube ni el despliegue público en esta auditoría. Se conservan los controles y mecanismos de recuperación existentes.

No es necesario aportar credenciales ni modificar Firebase para revisar estos cambios locales.
