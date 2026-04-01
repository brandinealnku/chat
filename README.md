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
