# Data security and encryption model

## Encryption at rest

Cloud Firestore provides server-side encryption for stored data. Vercel and configured AI providers manage storage under their own service controls. This is not end-to-end encryption because services that process plaintext can access it within their authorized processing boundary.

## Encryption in transit

The public application, Firebase APIs and external AI provider endpoints use HTTPS/TLS. The production frontend refuses a localhost or non-HTTPS API URL. Local development may use HTTP on loopback.

## Access control

Firebase Authentication establishes a uid. Owner-scoped Firestore rules restrict profiles, projects, documents, extracted sources and RAID records to that uid. Child creation also validates ownership of the parent project. The backend verifies ID tokens for private routes and never authorizes by a submitted email or owner identifier.

## Client-side encryption

PMO Compass does not currently encrypt project fields in the browser before Firestore. A safe optional design would use Web Crypto AES-GCM with a unique random IV per value and a key derived using a reviewed password KDF or held in a device key store. The key must never be stored beside the ciphertext in Firestore or sent to the backend.

That design is not enabled because it would materially change the product:

- Firestore could no longer query or filter encrypted fields.
- Project Intelligence and document generation need plaintext in the browser and, when external AI is selected, in the backend/provider boundary.
- Cross-device recovery requires a carefully designed key export/recovery flow; losing the key would permanently lose data.
- Existing documents and history require migration and versioned ciphertext formats.
- Browser compromise while the workspace is unlocked could still expose plaintext.

Implementing AES-GCM alone would create a misleading security claim and a serious key-loss risk. A future encrypted-storage mode needs an explicit threat model, versioned envelope format, recovery design, migration plan and independent cryptographic review. Any external AI action after decryption would not be end-to-end encrypted.

## AI data flow

Files are parsed in the browser and the original file is not uploaded or stored. The user reviews excerpts before saving them. Adding excerpts resets the project to the offline AI setting. For an external request, the backend constructs a minimal context containing only the selected PMO fields, request text, selected excerpts and selected previous drafts. It excludes account data, tokens, operational flags and persistent database identifiers.

The Offline PMO Engine runs inside the application backend without contacting Gemini, Groq or OpenRouter. It avoids disclosure to an external AI provider, but requests still reach the PMO Compass backend over HTTPS.
