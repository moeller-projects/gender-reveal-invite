# gender-reveal-invite

Single-page React app (Bun + Vite + TypeScript) with English/German i18n, Tailwind UI, and Firebase Firestore to store RSVPs.

## Quick start

- Prereq: Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Install deps: `bun install`
- Copy env: `cp .env.example .env` and fill Firebase values
- Run dev: `bun run dev`

## Firebase setup

1. Create a Firebase project (Spark/free) and enable Firestore (Native mode).
2. Create a web app and copy the config into `.env` using these keys:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

3. Firestore collections:
   - `rsvps` (created automatically when guests submit the form)
   - `wishlistItems` (created and managed through the wishlist admin page)

### Firestore security rules (write-only)

This rule allows anyone to create RSVPs, but blocks reads/updates/deletes. Consider adding rate limits or auth for production.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rsvps/{docId} {
      allow create: if true; // open write
      allow read, update, delete: if false; // no reads or modifications
    }
    match /wishlistItems/{docId} {
      allow read: if true; // wishlist is public
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

Deploy these in Firebase Console > Firestore Database > Rules.

### Prefill via deep-link token (optional)

If you want guests to prefill and update their RSVP via a personalized link, generate a token (e.g., a randomized string) per guest and send them a URL like:

`https://your-site.example.com/?token=UNIQUE_TOKEN`

When `token` is present, the app reads/writes the document `rsvps/UNIQUE_TOKEN`. If `token` is absent, it creates a new document with a random ID and does not preload.

To allow prefill reads/updates, use relaxed rules for `get`/`update` on a specific document ID (listing remains blocked):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rsvps/{docId} {
      allow create: if true; // open creation
      allow get, update: if true; // allow direct document read/update by ID
      allow list, delete: if false; // no listing or deletes
    }
    match /wishlistItems/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

Note: For stricter control, consider Firebase Auth or a proxy API.

## Fields collected

- name (string, required)
- total persons (number, required)
- email (string, optional)
- phone (string, optional)
- dietary needs (string, optional)
- rsvp (boolean; attending yes/no)
- needs couch (boolean)
- message (string, optional)
- language (auto from i18n)

Basic validation uses zod. A hidden honeypot field reduces spam.

## i18n

- `react-i18next` with browser language detection and a simple language switcher (English/German).
- Translations in `src/translations`.

## Styling

- Tailwind CSS v4 via `@import "tailwindcss";` in `src/index.css`.

## Countdown and Map

- Configure event date/time in `.env`:
  - `VITE_EVENT_DATETIME=2025-05-17T17:00:00+02:00` (ISO format recommended)
- Configure location:
  - `VITE_EVENT_ADDRESS=Street 1, 12345 City, Country`
  - The page shows an embedded map and a button to open route in Maps.

## Hero Image

- By default uses `public/couple-placeholder.svg`.
- To use a custom image, either replace the placeholder file or set:
  - `VITE_COUPLE_IMAGE_URL=https://your.cdn/img.jpg`

## Add to Calendar (.ics)

- Configure optional metadata in `.env` for calendar export:
  - `VITE_EVENT_TITLE=Gender Reveal Party`
  - `VITE_EVENT_DURATION_MINUTES=120`
- The “Add to Calendar” button generates an `.ics` file on the fly using `VITE_EVENT_DATETIME`, `VITE_EVENT_TITLE`, `VITE_EVENT_ADDRESS`, and a brief description.

## Registry

- To display a registry link in the details section, set:
  - `VITE_REGISTRY_URL=https://...`

## Wishlist

- `/wishlist` shows every document in `wishlistItems`.
- Guests can reserve an item; the reservation stays active until they release it (or an admin does).
- Share buttons use the Web Share API when available or copy a link fallback. Override the base with `VITE_WISHLIST_SHARE_BASE_URL` if the site is proxied.

### Admin view

- `/wishlist/admin` requires `VITE_ADMIN_ACCESS_CODE` to be set in `.env`.
- Admins can create, edit, delete, or release wishlist entries. Blank optional fields clear the stored value.
- Consider protecting writes via Firebase custom claims or a backend proxy for production deployments.
