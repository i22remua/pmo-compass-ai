# Compass visual system

Compass uses an editorial navigation language: warm paper, charcoal ink, a single orange signal, numbered sections and ruled records. The interface represents real project information; it does not invent map coordinates, completion percentages, trends or online/model readiness.

## Foundations

The shared implementation lives in `frontend/src/styles/tokens.css`, `workspace.css` and `marketing.css`. This redesign replaces the accumulated workspace styles, including the older card, chart and promotional styles, instead of adding another skin on top.

| Role | Treatment |
| --- | --- |
| Display | Inter Variable, large scale and tight spacing; an editorial serif accent on the public cover |
| Headings | Inter Variable, medium weight; section rules provide structure |
| Body | Existing self-hosted Inter Variable; no external font requests |
| Labels | Small, precise labels with restrained uppercase and tracking |
| Data | System monospace for dates, indices, provider names and counts |
| Canvas / ink | Warm paper `#f4f1e9`, charcoal `#24251f` |
| Signal | Orange `#b63c16`; light orange `#f3936d` for text in dark mode |
| Semantic colour | Separate warning, danger and success tokens; status always includes text |
| Spacing | 4 / 8 / 12 / 16 / 24 / 32 / 48 px, with responsive gutters |
| Lines | One-pixel data separators; two-pixel structural rules |
| Radius | Zero for records, fields and sheets; 2 px for controls |
| Interaction | 120–160 ms colour/position feedback; reduced-motion support |

## Composition

- **Cover:** asymmetric heading and a three-stage product index. The fictional case is available through its CTA and is not repeated on the cover.
- **Navigation:** numbered text index, an active position marker and a separate account/settings area. Numbers express location, not model or service status.
- **Control desk:** large unboxed portfolio totals above aligned project records. Recent documents follow the project register; they do not compete in a side panel.
- **Project records:** ordinal, sector, title, status, target date and document count. Ordinals describe position in the current list. Dossier headings use an abbreviated existing project ID, not a new data identifier.
- **Dossier:** project masthead, facts register and indexed section navigation. Objectives, notes and stakeholders are divided by rules. Facts and inferred intelligence remain separate.
- **Assembly desk:** numbered preparation steps beside a paper-like document preview. Project selection, all eight formats, language, context, history opt-in, fallback, cancellation, provenance, saving, copying and export remain available.
- **Archive:** aligned document rows with provider, project, date and language. On phones, each row becomes a readable two-line record; the whole record remains one link.
- **Intelligence:** risk reference labels and source/proposed-priority text, expandable evidence and mitigations, separate confidence/health explanations. No synthetic risk trends or progress gauges.
- **Forms and dialogs:** underlined fields and a native dialog sheet with a signal edge. Existing validation and persistence logic are preserved.

## Responsive and accessible behaviour

Desktop keeps a narrow index and wide reading surfaces. Tablet reflows record metadata and gives the generator a two-column preparation area when the preview moves below it. Phone layouts use a modal navigation index, two-column dossier section controls and compact project/document records. No important project facts are replaced with decorative charts.

Controls have a 44 px minimum target. The closed mobile index is hidden from keyboard access. Its open state locks background interaction, contains keyboard focus, closes with Escape and returns focus to its trigger. Resizing to desktop closes it. Dossier sections support Arrow keys, Home and End, with explicit tab/panel relationships. Native modal sheets retain browser focus handling.

Theme and language settings remain persistent; reduced motion removes transitions. Contrast is checked on both themes, including hovered records. Tables within generated Markdown can scroll within their own region rather than overflowing the page. Automated checks complement visual review; they do not constitute an accessibility certification.

## Boundaries

This is a presentation refactor. API contracts, project/document schemas, Firebase ownership, authentication, provider routing, quotas and offline generation are unchanged. Existing saved data requires no migration. Pre-generated case content retains its explicit Offline PMO Engine label.
