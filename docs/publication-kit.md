# Publication kit

Current material for the public PMO Compass AI release. Spanish is the primary LinkedIn version; English is an alternative. The post is prepared, not published.

| Material | Source |
| --- | --- |
| Spanish post | [Español](linkedin-publication.md#español) |
| English post | [English](linkedin-publication.md#english) |
| Recommended image order | [Screenshot selection](linkedin-publication.md#recommended-screenshots) |
| Share-link image | [Public Open Graph card](https://pmo-compass-ai.vercel.app/opengraph-image) |
| Capture provenance | [Manifest](screenshots/capture-manifest.json) |
| Product delivery | [Delivery report](delivery-public-workspace.md) |
| Actual checks and limitations | [Validation](VALIDATION.md) |
| Public environment | [Deployment](deployment.md) |

## Updated images

Fifteen images were captured from the live app after the editorial redesign (no illustrated product mockup, decorative charts or promotional sidebar cards): landing (desktop, dark, hero and mobile), dashboard (desktop, dark and mobile), generator (desktop, dark and mobile), a saved document, Project Intelligence and a concise Copilot answer, the public case study and the contribution page. The actual provider labels remain visible. Captures use a fresh, isolated browser and fictional Starter Projects; no real user account or client data appears.

Reproduce against the public app:

```bash
SCREENSHOT_BASE_URL=https://pmo-compass-ai.vercel.app \
SCREENSHOT_EXTERNAL_AI=true npm run screenshots
```

The external-AI option makes two generation calls with fictional input. Check the actual provider in the manifest: configured AI can still fall back offline. Mobile generation is forced offline to illustrate the fallback. Without the option, the script uses offline generation and skips the Copilot image; an existing Copilot image is not refreshed in that run. The default URL remains the local frontend for development.

## Before posting

Open the public URL, select the Spanish or English text, and upload the recommended three images. Keep the source repository and live URL in the post. Publish manually from the owner's LinkedIn account.

The earlier video in ignored `delivery/linkedin/` predates the compact interface and live Gemini setup. It is historical material; do not present it as a recording of the current version. A new video was not part of this screenshot/text update.
