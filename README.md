# ITSBAD Chat v1

Production-style SaaS starter for a chatbot funnel + dashboard.

## Included
- `index.html` landing page + interactive setup funnel
- `app.html` dashboard shell
- `styles.css` shared styling
- `firebase-config.js` Firebase modular SDK starter
- `landing.js` signup + project save flow
- `app.js` dashboard loading + branding save flow
- `widget.js` embeddable widget starter

## Before you deploy
1. Replace the placeholder values in `firebase-config.js`
2. Enable Email/Password auth in Firebase Auth
3. Create Firestore and Storage
4. Set rules
5. Create Firestore indexes (or deploy `firestore.indexes.json`)

## Composite index required for latest-project query

If your dashboard query is:

```js
query(
  collection(db, "projects"),
  where("userId", "==", user.uid),
  orderBy("createdAt", "desc"),
  limit(1)
)
```

create this composite index:

- Collection ID: `projects`
- Fields:
  - `userId` → Ascending
  - `createdAt` → Descending
- Query scope: Collection

You can create it manually in **Firebase Console → Firestore Database → Indexes → Composite → Create index**
or deploy the included `firestore.indexes.json`:

```bash
firebase deploy --only firestore:indexes
```

## Debugging "Saving..." never completes

Open browser DevTools (`F12`) before clicking save:

1. **Console tab**
   - Look for `[saveProjectToFirebase] Starting save flow`
   - Check for `SAVE PROJECT ERROR` logs and `error.code`
2. **Network tab**
   - Confirm calls to `identitytoolkit.googleapis.com` (Auth), `firestore.googleapis.com` (Firestore), and `firebasestorage.googleapis.com` (Storage when uploading files)
3. **Auth checks**
   - Ensure Email/Password sign-in provider is enabled in Firebase Auth
4. **Rules checks**
   - Verify your Firestore and Storage rules allow this user to write

## Suggested Firestore rules
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null && (
        request.auth.uid == resource.data.userId ||
        request.auth.uid == request.resource.data.userId
      );
    }
  }
}
```

## Suggested Storage rules
```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /projects/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Important
The preview and widget are UI-complete but still use demo responses. To make this truly live, add:
- a website scraping/indexing endpoint
- file extraction/chunking
- a chat endpoint
- Stripe checkout or billing portal

## Next recommended backend routes
- `POST /api/projects/create`
- `POST /api/projects/:id/upload`
- `POST /api/projects/:id/scrape-url`
- `POST /api/projects/:id/generate-preview`
- `POST /api/chat`
