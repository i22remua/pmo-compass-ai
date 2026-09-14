# LinkedIn demo script

A 60–90 second recording showing a complete PM workflow. Use the English interface for the narration below; the same steps work in Spanish.

Recording status: the script and example input are prepared; the actual video is still pending. Full/short posts, captions and a bilingual storyboard are in [linkedin-publication.md](linkedin-publication.md). Follow the [release checklist](release-checklist.md) before adding public repository/video links.

## Prepare the recording

1. Run `npm run setup` if needed, then `npm run dev`. Keep `AI_PROVIDER=demo`.
2. Open a fresh browser context at `http://localhost:3000`, select EN and choose a theme. Fresh storage keeps the recording separate from your existing local work.
3. Use a desktop viewport around 1440 × 1000. Close unrelated tabs, notifications and developer tools. Avoid exposing real account details or environment files.
4. Prepare the short project fields and generation context below in a text editor for quick pasting.
5. Rehearse once, including clipboard permission. Use the existing Summit/Relay examples if you prefer a shorter cut. All people and figures in this script are fictional.

## 85-second storyboard

| Time | On screen | Suggested English voiceover |
| --- | --- | --- |
| 0–8s | Landing hero and source/report example | “Project updates often start as scattered notes, risks and decisions. I built PMO Compass AI to turn that context into clear PMO documents.” |
| 8–16s | Click Log in, then Try the demo | “This is a full-stack portfolio project. Firebase supports private accounts; this demo opens immediately with fictional projects and no account required.” |
| 16–25s | Dashboard metrics and Demo Mode; briefly show Projects | “The workspace brings projects, stakeholders, notes and saved reports together, with examples across technology, construction, events and logistics.” |
| 25–40s | New project; paste prepared fields and create | “I'll create a launch project with a delivery delay, an owner and a pending decision.” |
| 40–54s | Open project → Generate with AI → Weekly Status Report; choose EN and generate | “The generator combines the saved project context with the audience and purpose of this update.” |
| 54–64s | Show formatted report, provider label; copy and save | “The default provider uses local rules and templates. I review the draft, copy it and save the exact version.” |
| 64–76s | Select Risk Register, generate, show source evidence and mitigation | “Risk Radar links candidate risks to the notes and marks assessments and owners for review.” |
| 76–85s | Save the risk register; open Document history | “Built with Next.js, TypeScript, FastAPI and Firebase, this project connects software engineering, AI workflow design and project management.” |

The narration is a guide: pause long enough for the source quote and provider label to be readable. A 60-second cut can start from the seeded Relay project and shorten the project-creation sequence with an explicitly edited cut.

## Prepared project input

Paste these values into **New project**. Dates and budget can stay blank; no invented values are needed.

| Field | Value |
| --- | --- |
| Name | Relay · Launch review |
| Sector | Logistics |
| Description | Prepare the launch review for a distribution hub serving 12 stores. |
| Objectives | Confirm loading windows and complete traceability checks before approving launch. |
| Stakeholders | Clara — Operations sponsor; Nuria — Systems integration; Tomás — Carrier coordination. |

Notes:

```text
The warehouse layout is approved by Clara.
Carrier onboarding is delayed by 4 days because loading windows are not confirmed.
Nuria must confirm the barcode correction and retest plan by 18 September.
Tomás must agree loading windows with the carrier by 17 September.
Decision needed: approve a phased launch after retesting or revise the delivery date.
```

Additional generation context:

```text
Prepare the sponsor review. Highlight the carrier delay, the decision needed and the next accountable actions. Keep unsupported dates and estimates unconfirmed.
```

In ES, use the seeded **Relay · Distribución regional** or translate the prepared fields before recording. Switching only the document language does not translate quoted source text in template mode.

## Login alternatives

The default local configuration visibly explains that real email sign-in requires Firebase. Show **Log in → Try the demo**; do not pretend that the demo identity is an authenticated account.

To demonstrate real registration/login, configure Firebase as described in the README or use the emulator test workflow. Record with a dedicated test account and fictional projects. Real accounts start empty; the demo loader never writes examples into a cloud account.

## Shots for a LinkedIn carousel or GitHub README

1. **Hero:** product name, tagline and visible draft beside the source notes.
2. **Dashboard:** quick metrics, Demo Mode, sector examples and recent documents.
3. **AI Generator:** project/type/language/context plus a generated risk register and actual provider.
4. **Saved document:** reopen the generated draft to demonstrate persistence and copy/export.
5. **Mobile or dark theme:** one optional shot demonstrating responsive polish.

Run `npm run screenshots` with the development app active to refresh the included ten images. Add a saved-document shot from your recording if desired. The README includes placeholders for a live deployment link, video and authenticated-cloud capture; fill them only when those artifacts exist.

## Closing caption

“PMO Compass AI — From project noise to executive clarity. A professional portfolio project by Álvaro Redondo Muñoz. Default demo: deterministic templates. Optional local Ollama integration.”

Keep claims specific to what the recording shows. The repo contains a LinkedIn post draft; publishing it and adding repository/deployment links remain manual steps.
