# limassol-on-map

I am living in Limassol, Cyprus city. Wonderful city and I want to make it more comfortable for those who live here long-term and those who came for vacation.

## Public app (v1 — pharmacies)

Firebase Hosting + Cloud Functions + React (Leaflet / OSM). This repository root is the deployable public tree (Hosting, Functions, static pharmacy JSON, web client).

### Layout

```
.
  data/pharmacies.json   # pharmacy dataset
  web/                   # React + Vite + react-leaflet
  functions/             # Cloud Functions (GET /api/pharmacies)
  firebase.json
  .firebaserc
```

### Local development

```bash
# API (local Express server)
cd functions && npm install && npm run serve

# Web
cd web && npm install && npm run dev
```

By default the web app calls `/api/pharmacies` (Vite proxy → local function or static JSON).

### Firebase deploy

1. Sign in with the project owner Google account
2. Firebase project id: `limassol-on-map`, Functions region: `europe-west1`
3. `npm i -g firebase-tools` → `firebase login` → from this directory:
   - `firebase use limassol-on-map`
   - `cd functions && npm i && cd ..`
   - `cd web && npm i && npm run build && cd ..`
   - `firebase deploy`

### i18n

UI strings: Russian / English / Greek in `web/src/i18n.ts`. Pharmacy names and addresses in the dataset may include original-language text from OSM and public duty lists.
