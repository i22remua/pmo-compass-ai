# Caso público y navegación del proyecto

10 de octubre de 2026. Primer despliegue directo autorizado y realizado. La posterior publicación conjunta se documenta en la [auditoría final](visual-consistency-audit.md). Incluye las mejoras previas de dashboard y diagnóstico.

## Caso de dos minutos

- Dos columnas en escritorio: datos ficticios a la izquierda y resultado a la derecha. Nombre, descripción, estado, fecha objetivo y presupuesto visibles; notas y contexto completo desplegables.
- Resumen extractivo: estado declarado y primera evidencia de un riesgo clasificado como aportado, cuando existe. No introduce una nueva evaluación de salud ni una prioridad.
- Hasta tres asuntos visibles, en el orden recibido. Cada uno conserva su procedencia, acción propuesta y acceso a evidencia, causas e impacto. Las mitigaciones idénticas se muestran una sola vez inicialmente; siguen disponibles en el detalle de cada asunto.
- El resto de asuntos y el documento completo son desplegables. Copia y exportación mantienen el contenido completo y el formato elegido.
- El registro precalculado solo se muestra al elegir Registro de riesgos. Los otros formatos muestran «Pendiente de generar» hasta disponer de un resultado del mismo tipo e idioma.
- Se distinguen ejemplo precalculado, generación en curso, resultado generado y proveedor utilizado. Un fallo conserva el último resultado válido del formato seleccionado; nunca sustituye otro formato por el ejemplo de riesgos.
- Avisos de privacidad, procedencia y revisión humana conservados. Acceso «Ir al resultado» en móvil para evitar recorrer toda la fuente.

## Navegación

Antes de modificarla se revisaron el estado `tab`, el efecto de `hashchange`, `pushState`, los enlaces a registros y las protecciones de notas. La solución cambia únicamente la agrupación visual.

- Cuatro accesos principales: Resumen, Diagnóstico, Seguimiento y Contexto.
- Contexto agrupa Fuentes y privacidad, Notas del proyecto y Documentos. Conserva el contador documental y la señal de notas sin guardar.
- No se duplican vistas ni se cambia el estado interno. Los hashes `#overview`, `#diagnosis`, `#intelligence`, `#risks`, `#scenario`, `#copilot`, `#tracking`, `#sources`, `#notes` y `#documents` siguen funcionando.
- Contexto abre `#sources`; al estar dentro del grupo, pulsarlo conserva la subsección actual. Los parámetros de URL y enlaces a registros permanecen intactos.
- Flechas, Inicio y Fin disponibles en ambos niveles de pestañas. Diagnóstico permanece visible en móvil; las cuatro secciones caben sin desplazamiento horizontal.
- Se conserva la protección de notas para cambios de sección, enlaces, historial y recarga. La compatibilidad del aviso al recorrer el historial sigue dependiendo de Navigation API, como antes de este cambio.

## Archivos

- `frontend/src/app/case-study/page.tsx`
- `frontend/src/components/project-navigation.tsx`
- `frontend/src/styles/marketing.css` y `workspace.css`
- `frontend/src/locales/es.ts` y `en.ts`
- Pruebas en `e2e/demo.spec.ts`, `context.spec.ts`, `error-states.spec.ts`, `firebase.spec.ts` y `review.spec.ts`.
- README y roadmap actualizados para distinguir cambios locales de la versión publicada.

No se modifican la página interna del proyecto, los modelos, permisos, almacenamiento, hooks de análisis, prompts ni proveedores. No hay nuevas dependencias.

## Validación

Se utiliza una copia aislada con los mismos 62 archivos fuente del frontend y lockfile, Node 22 y puertos exclusivos para las pruebas. La configuración de puertos y rutas de Python se adapta solo en esa copia.

- TypeScript, ESLint y compilación de producción: correctos.
- Playwright: 54 pruebas de interfaz verificadas, incluyendo los cambios previos de dashboard y diagnóstico.
- Firebase Auth y Firestore: 4 pruebas de integración superadas en emuladores.
- Formato, documentación y `git diff --check`: correctos.

Se comprueban los ocho formatos del selector, resultado precalculado, generación con el motor local, respuesta externa simulada, petición en curso, fallo de red, conservación del último resultado válido, copia y descarga. El caso se verifica en español e inglés, con temas claro/oscuro, anchos de 375 y 768 px y accesibilidad con axe. La navegación también se prueba a 390 px, con teclado, enlaces profundos, parámetros, historial y cambio de proyecto. Las pruebas existentes siguen cubriendo los avisos de notas sin guardar, los accesos desde el dashboard y el seguimiento.

Se revisaron capturas de escritorio y móvil. Las pruebas de navegador usan Chromium; no certifican Safari/Firefox ni proveedores externos reales. No se ha medido con usuarios el tiempo de comprensión de dos minutos.

## Despliegue

- Frontend: https://pmo-compass-ai.vercel.app
- Vercel: `9g9MKdduT62VynAPpwR5p5WcPYbx`, estado `READY`.
- Incluye dashboard, diagnóstico, caso público y navegación. Backend, Firebase y controles de seguridad sin cambios.
- Despliegue directo desde una copia limpia de los fuentes verificados. Revisión de secretos correcta sobre los 74 archivos de entrega; no se incluyen archivos `.env`, credenciales, cachés ni resultados de pruebas.
- Este primer despliegue precedió al commit y push de la revisión conjunta; consultar la auditoría final para el estado de entrega.

Verificación posterior al despliegue:

- `smoke:public` correcto: páginas públicas, documentación del API, imagen social, salud, CORS, generación offline, diagnóstico, contradicciones, escenarios y rechazo de acceso privado sin autorización.
- Cinco comprobaciones de navegador verificadas sobre la URL pública: caso ES/EN con generación real forzada al motor offline, formatos y estados ES/EN con respuesta externa simulada, y navegación entre secciones/proyectos con enlaces profundos e historial.
- Se confirma que el caso no modifica los datos `pmo.*` del espacio de trabajo. El almacenamiento técnico de reCAPTCHA/App Check se excluye de esa comparación, sin desactivar sus controles.
- Gemini real y persistencia con cuentas de producción no se vuelven a validar en esta entrega; Firebase se verifica en emuladores.
