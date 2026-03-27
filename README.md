# Sametha App

A React Native (Expo) app that sends a daily morning notification with a Telugu proverb (sametha) from saamethalu.com.

## Architecture

```
saamethalu.com  →  Python scraper  →  Firebase Firestore
                                              ↓
                                         Expo App
                                    (fetches + caches)
                                              ↓
                                    Local notifications
                                    (user-set time, 30 days ahead)
```

---

## Step 1 — Firebase Setup

### 1.1 Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name (e.g., `sametha-app`) → Continue
3. Disable Google Analytics (not needed) → **Create project**

### 1.2 Enable Firestore

1. In the left sidebar: **Build → Firestore Database**
2. Click **Create database** → choose **Production mode** → pick a region → **Enable**
3. Go to the **Rules** tab and replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /saamethas/{doc} {
      allow read: if true;
      allow write: if false;
    }
    match /meta/{doc} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

Click **Publish**.

### 1.3 Add a Web App (for the mobile app)

1. In Project Overview → click the **</>** (Web) icon → Register app (name: `sametha-mobile`)
2. Copy the `firebaseConfig` values — you'll need them in Step 3

### 1.4 Create a Service Account (for the scraper)

1. Project Settings (gear icon) → **Service accounts**
2. Click **Generate new private key** → Download the JSON file
3. Save it somewhere safe (e.g., `scraper/serviceAccount.json`)

---

## Step 2 — Run the Scraper

```bash
cd sametha-app/scraper

# Install dependencies
pip install -r requirements.txt

# Scrape + upload to Firestore in one step
python scrape.py --service-account serviceAccount.json
```

This scrapes ~1000+ saamethas from saamethalu.com and uploads them to your Firestore database. It takes about 30–60 seconds.

**Optional:** To preview locally before uploading:
```bash
python scrape.py
# Saves saamethas.json without uploading
```

---

## Step 3 — Configure the Mobile App

```bash
cd sametha-app/mobile

# Install Node dependencies
npm install

# Create your .env file
cp .env.example .env
```

Open `.env` and fill in the values from the Firebase web app config (Step 1.3):

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Step 4 — Run the App

```bash
# Start Expo dev server
npm start
```

Then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with **Expo Go** app on your physical device

> **Note:** Push notifications only work on **physical devices**, not simulators.

---

## Step 5 — Build for Production

Install EAS CLI:
```bash
npm install -g eas-cli
eas login
eas build:configure
```

Build for both platforms:
```bash
# Android APK/AAB
eas build --platform android

# iOS IPA (requires Apple Developer account)
eas build --platform ios
```

---

## App Features

| Screen | Description |
|--------|-------------|
| **Today** | Today's sametha (changes daily). Tap **Random** for a different one. |
| **Browse** | Full list with search. Tap share icon on any sametha. |
| **Settings** | Set notification time. Test with "Send Test Notification". |

## How Notifications Work

- Notifications are **local** (scheduled on-device) — no server required after setup
- 30 days of notifications are scheduled upfront with different saamethas
- When fewer than 7 remain, the app reschedules the next 30 on the next open
- iOS supports max 64 scheduled notifications; 30-day batches stay well within this limit

---

## Project Structure

```
sametha-app/
├── scraper/
│   ├── scrape.py           # One-time scraper
│   └── requirements.txt
└── mobile/
    ├── app/
    │   ├── _layout.tsx         # Root layout (permissions, splash)
    │   ├── +not-found.tsx
    │   └── (tabs)/
    │       ├── _layout.tsx     # Tab bar
    │       ├── index.tsx       # Today's Sametha screen
    │       ├── browse.tsx      # Browse + search
    │       └── settings.tsx    # Notification time picker
    ├── services/
    │   ├── firebase.ts         # Firestore client
    │   ├── saamethas.ts        # Fetch + cache saamethas
    │   └── notifications.ts   # Schedule local notifications
    ├── app.json
    ├── package.json
    └── .env.example
```
