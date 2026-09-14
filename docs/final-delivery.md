# Final delivery

PMO Compass AI is ready for a Spanish-first portfolio presentation. The application baseline is public; this delivery adds presentation polish and reproducible recording assets. Further pushes and social posts remain owner-controlled.

## GitHub verification

Checked on **14 September 2026**, using GitHub's public repository API, remote Git refs and a browser without authentication:

| Item | Verified result |
| --- | --- |
| Repository | [i22remua/pmo-compass-ai](https://github.com/i22remua/pmo-compass-ai), public |
| Default branch | `main` |
| Published application commit | `443dd0a8abb9fcb033906a3c74f9ca2889b7e925`, matching the local baseline |
| Existing tag | `v0.1.0-rc1`, pointing to the same commit |
| GitHub Actions | [Quality and integration passed](https://github.com/i22remua/pmo-compass-ai/actions/runs/34795716626) for that commit |
| README presentation | Hero and dashboard images load in the rendered GitHub README |
| Repository description | Matches the approved bilingual PMO description |
| Topics | Not configured at this checkpoint; use the list in [GitHub setup](github-setup.md#repository-details) |
| Hosted application, GitHub release, licence | Not present at this checkpoint |

**This is the correct public repository for LinkedIn.** Publish the local delivery update manually and check its own Actions run before calling that updated revision final. The existing tag remains attached to the initial baseline; it has not been moved or replaced. No remote settings, push or LinkedIn post were changed by this review.

## Delivery pack

The local folder `delivery/linkedin/` contains:

| File | Use |
| --- | --- |
| `pmo-compass-ai-demo-es.mp4` | Approximately 83 seconds, H.264, 1440 × 1000, 25 fps; Spanish interface and visible captions |
| `pmo-compass-ai-demo-es.srt` | Spanish subtitles for editing |
| `pmo-compass-ai-demo-en.srt` | English translation of the same chapter captions |
| `01-landing-es.png` | Product hero |
| `02-dashboard-es.png` | Demo workspace and metrics |
| `03-risk-register-es.png` | A generated risk with source evidence |
| `04-saved-document-es.png` | A document reopened from history |
| `05-dark-document-es.png` | Dark-theme document view |
| `post-es.txt`, `post-en.txt` | Full posts ready to paste, with the verified repository URL |
| `post-short-es.txt`, `post-short-en.txt` | Short alternatives |
| `README.md` | Spanish upload checklist |

`delivery/pmo-compass-ai-linkedin.zip` groups the upload files. The MP4 is silent: no music, synthetic speech or unrecorded narration is implied. Captions explicitly identify the template demo. All interactions use a fresh browser context and fictional local data; existing user work and Firebase data are untouched.

The pack is intentionally excluded from Git to keep video exports and temporary recordings out of the source repository. The recording script, this guide and the [saved-document screenshot](screenshots/saved-document-es.png) are versioned. Public readers can reproduce the media locally.

## Reproduce the recording

With the default local demo configured:

```bash
npm run setup
npm run dev
```

In another terminal:

```bash
npx playwright install chromium
npm run record:demo
```

This generates a WebM, the five screenshots and ES/EN subtitles. For MP4, set `FFMPEG_BIN` to an available FFmpeg executable with the `libx264` encoder before running the same command. FFmpeg is an optional media-production tool; it is not an application dependency. The delivered MP4 was encoded with an isolated temporary tool installation.

The recorder checks that the backend uses local `demo` authentication and generation. It opens isolated browser storage, walks through the existing Relay project, generates and saves a weekly report and risk register, and reopens the saved document. It does not provision Firebase, download a model or use a paid API. A new capture overwrites only the generated presentation files and the saved-document screenshot.

## Publish in Spanish first

1. Review the local update and push only when authorised. Wait for the exact new commit to pass GitHub Actions.
2. Add the recommended topics to the repository About section. The description is already correct.
3. Review the MP4 once. Upload it directly to a LinkedIn post and paste `post-es.txt`.
4. Use the repository URL in the post. Do not advertise a hosted demo until deployment is verified.
5. Use `post-en.txt` for a later English publication, or the images for a separate visual post.

The source of the post text is [linkedin-publication.md](linkedin-publication.md). The [release checklist](release-checklist.md) records remaining hosting/licence/release choices. A licence or GitHub pre-release has not been selected automatically.

## Technical scope

No product functionality, architecture, AI provider or paid dependency changed in this delivery pass. README publication status and clone instructions were polished, placeholder post links were removed, the saved-document image was added, and a recording command was prepared.

The published CI run reported deprecated Node 20 action runtimes. The delivery updates the workflow to action versions whose manifests use Node 24, while keeping the application's Node 22 environment and existing test commands. The workflow still needs a remote run after the owner pushes this update.

The previous nine moderate development-tool dependency findings remain documented; production dependency findings were zero at the release audit. Firebase evidence comes from emulators, and live Ollama inference/deployment remain separate environment checks.
