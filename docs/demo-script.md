# LinkedIn workspace script

A 60–90 second recording showing a complete PM workflow. Use the English interface for the narration below; the same steps work in Spanish.

Historical recording (refresh for this revision): an approximately **83-second Spanish capture** is prepared in the local delivery pack, using the existing Relay project. It includes visible Spanish captions and separate ES/EN subtitles, with no narration or music. See [final-delivery.md](final-delivery.md). The 85-second storyboard below is an optional alternative that adds a new-project segment. Full/short posts are in [linkedin-publication.md](linkedin-publication.md).

## Prepare the recording

1. Run `npm run setup` if needed, then `npm run dev`. Use `AI_PROVIDER=offline` for a reproducible recording without external calls.
2. Open a fresh browser context at `http://localhost:3000`, select EN and choose a theme. Fresh storage keeps the recording separate from your existing local work.
3. Use a desktop viewport around 1440 × 1000. Close unrelated tabs, notifications and developer tools. Avoid exposing real account details or environment files.
4. Prepare the short project fields and generation context below in a text editor for quick pasting.
5. Rehearse once, including clipboard permission. Use the existing Summit/Relay examples if you prefer a shorter cut. All people and figures in this script are fictional.

## 85-second storyboard

| Time | On screen | Suggested English voiceover |
| --- | --- | --- |
| 0–8s | Landing hero and source/report example | “Project updates often start as scattered notes, risks and decisions. I built PMO Compass AI to turn that context into clear PMO documents.” |
| 8–16s | Click Start now | “This is a full-stack portfolio project. Firebase supports private accounts; this workspace opens immediately without an account; starter projects are optional.” |
| 16–25s | Dashboard and optional Starter Projects; briefly show Projects | “The workspace brings projects, stakeholders, notes and saved reports together, with examples across technology, construction, events and logistics.” |
| 25–40s | New project; paste prepared fields and create | “I'll create a launch project with a delivery delay, an owner and a pending decision.” |
| 40–54s | Open project → Generate with AI → Weekly Status Report; choose EN and generate | “The generator combines the saved project context with the audience and purpose of this update.” |
| 54–64s | Show formatted report, provider label; copy and save | “This recording uses the Offline PMO Engine with local rules and templates. I review the draft, copy it and save the exact version.” |
| 64–76s | Select Risk Register, generate, show source evidence and mitigation | “Risk Radar links candidate risks to the notes and marks assessments and owners for review.” |
| 76–85s | Save the risk register; open Document history | “Built with Next.js, TypeScript, FastAPI and Firebase, this project connects software engineering, AI workflow design and project management.” |

The narration is a guide: pause long enough for the source quote and provider label to be readable. A 60-second cut can start from the Relay project after choosing Add starter projects and shorten the project-creation sequence with an explicitly edited cut.

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
Audience: programme sponsor. Purpose: weekly distribution launch review. Keep the tone concise and professional.
```

In ES, use the seeded **Relay · Distribución regional** or translate the prepared fields before recording. Switching only the document language does not translate quoted source text in template mode.

## Login alternatives

The default local configuration visibly explains that real email sign-in requires Firebase. Show **Start now**; do not pretend that the browser-local identity is an authenticated account.

To demonstrate real registration/login, configure Firebase as described in the README or use the emulator test workflow. Record with a dedicated test account and fictional projects. Real accounts start empty; the starter loader never writes examples into a cloud account.

## Shots for a LinkedIn carousel or GitHub README

1. **Hero:** product name, tagline and visible draft beside the source notes.
2. **Dashboard:** quick metrics, Starter Projects, sector examples and recent documents.
3. **AI Generator:** project/type/language/context plus a generated risk register and actual provider.
4. **Saved document:** reopen the generated draft to demonstrate persistence and copy/export.
5. **Mobile or dark theme:** one optional shot demonstrating responsive polish.

Run `npm run screenshots` with the development app active to refresh the included ten images. Add a saved-document shot from your recording if desired. The README links to the verified source repository and states that hosting is pending. The saved-document shot is already included; any authenticated-cloud recording must use a dedicated test account.

## Closing caption

“PMO Compass AI — From project noise to executive clarity. A professional portfolio project by Álvaro Redondo Muñoz. Free-tier AI adapters with an explainable Offline PMO Engine fallback.”

Keep claims specific to what the recording shows. The repo contains a LinkedIn post draft; publishing it and adding repository/deployment links remain manual steps.
