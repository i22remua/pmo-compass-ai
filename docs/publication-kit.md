# Publication kit

Final presentation material for the public PMO Compass AI candidate. **Spanish is the primary LinkedIn publication language.** The English version is included as an alternative.

| Material | Source |
| --- | --- |
| Spanish-first LinkedIn post | [Spanish publication](linkedin-publication.md#publicación-recomendada--español) |
| English alternative | [English publication](linkedin-publication.md#recommended-post--english) |
| Delivery files and GitHub verification | [Final delivery](final-delivery.md) |
| Short English and Spanish posts | [Short publication versions](linkedin-publication.md#short-version--english) |
| Video captions and bilingual storyboard | [Video presentation](linkedin-publication.md#video-script) |
| GitHub name, description and topics | [GitHub repository details](github-setup.md#repository-details) |
| First commit, push and candidate tag | [GitHub setup](github-setup.md) |
| Prepared project notes for the recording | [Demo script](demo-script.md#prepared-project-input) |
| Final readiness and outstanding steps | [Release checklist](release-checklist.md) |
| Technical evidence and remaining limits | [Final audit](final-audit.md) and [validation](VALIDATION.md) |
| Hosted application setup | [Deployment guide](deployment.md) |

## Recommended screenshot set

1. [Product hero](screenshots/landing-hero-en.png): value proposition and a visible source-to-document example.
2. [Dashboard](screenshots/dashboard-es.png): real metrics, Demo Mode and the working workspace.
3. [Risk generator](screenshots/generator-risk-register.png): project context, document language, provider and source evidence.
4. [Saved document](screenshots/saved-document-es.png): a generated risk register reopened from history.
5. [Dark dashboard](screenshots/dashboard-dark-es.png) or [mobile generator](screenshots/generator-mobile.png): optional visual polish.

Ten existing images are generated from the actual app with `npm run screenshots`; `npm run record:demo` adds the saved-document capture. The local delivery pack also includes five viewport captures from the Spanish recording. For LinkedIn, use readable crops of the first three images and keep the provider label visible. Fictional projects are demonstration material, not evidence of client outcomes.

## Finished recording

The local pack in `delivery/linkedin/` contains an approximately 83-second H.264 MP4, Spanish captions on the video, ES/EN subtitle files, five screenshots, full/short posts and an upload checklist. The recording is silent and uses real app interactions with fictional demo data. It does not simulate live LLM inference or Firebase login.

The MP4 and upload pack are intentionally excluded from Git; the reproducible recording script and documentation are committed. Follow [final-delivery.md](final-delivery.md) to reproduce the capture or locate the handoff files. Upload the MP4 natively to LinkedIn and paste the Spanish post. The app's source repository is public; hosting and the LinkedIn post itself remain manual steps.
