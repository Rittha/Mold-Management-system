# Real-Time Notification Badge System - Complete Implementation Guide

## Overview

This guide provides a production-ready notification badge system for Firebase Hosting that displays unread item counts from Firestore in real-time.

**Project:** mold-management-439a8  
**Tech Stack:** Firebase SDK v9 (Modular), Vanilla HTML/JS  
**Deployment:** Firebase Hosting

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Frontend Pages (index.html, pdd.html, qcd.html, qad.html)│
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────v────────┐    ┌────────v────┐
    │ notifications.js│   │  firebase-config.js │
    └────┬────────┘    └────────┬────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────v──────┐
              │  Firestore  │
              │  onSnapshot │
              │ (isRead=false)
              └─────────────┘
```

### Files Included

1. **frontend/firebase-config.js** - Centralized Firebase initialization
2. **frontend/notifications.js** - Core badge system & real-time listener
3. **frontend/css/style.css** - Badge styling (already updated)
4. **public/firebase-messaging-sw.js** - Optional FCM service worker
5. **frontend/index.html, pages/*.html** - Updated with badge integration

---

## 1. Core Files Explanation

### firebase-config.js

Handles Firebase initialization and exports `db` (Firestore instance).

**Key Features:**
- Single source of truth for Firebase config
- Error handling for failed initialization
- FCM setup boilerplate (commented out for optional use)
- Exports: `firebaseApp`, `auth`, `db`

**Usage in notifications.js:**
```javascript
import { db } from './firebase-config.js';
```

### notifications.js

Core notification badge system with real-time Firestore listener.

**Key Functions:**

#### `startNotificationBadge(options)`
Starts listening to unread notifications.

```javascript
// Basic usage (auto-injects link)
const unsubscribe = await startNotificationBadge();

// Advanced usage
const unsubscribe = await startNotificationBadge({
  collectionName: 'notifications',  // Change to any collection
  enableAppBadge: true,              // PWA app badge
  autoInject: true                   // Auto-inject into .nav
});

// Stop listening later
unsubscribe();
```

#### `injectNotificationLink(options)`
Manually create the notification UI element.

```javascript
import { injectNotificationLink } from './notifications.js';

injectNotificationLink({ navSelector: '.nav' });
```

#### `stopNotificationBadge()`
Clean shutdown of the listener.

```javascript
window.NotificationBadge.stop();
```

#### Global API
Access via `window.NotificationBadge`:

```javascript
window.NotificationBadge.start();        // Start listener
window.NotificationBadge.stop();         // Stop listener
window.NotificationBadge.getCount();     // Get current count
window.NotificationBadge.isListening();  // Check if active
```

---

## 2. Firestore Collection Structure

**Collection:** `notifications`  
**Required Field:** `isRead` (boolean)

### Example Document

```javascript
{
  id: "notif-001",
  isRead: false,  // ← This field is queried
  title: "New task assigned",
  message: "Task PDD-123 needs review",
  createdAt: "2026-06-09T10:30:00Z",
  userId: "user-456",
  type: "task_alert"
}
```

### Alternative Collections

You can count unread items from **any** collection that has an `isRead` field:

```javascript
// Count unread from "alerts" collection
await startNotificationBadge({ collectionName: 'alerts' });

// Count unread from "tasks" collection
await startNotificationBadge({ collectionName: 'tasks' });

// Count unread from "messages" collection
await startNotificationBadge({ collectionName: 'messages' });
```

---

## 3. UI Elements & Styling

### HTML Structure

The notification link is **injected dynamically** by `notifications.js`:

```html
<a id="notificationLink" href="#notifications" class="notification-link">
  Notifications
  <span id="notificationBadge" class="notification-badge"></span>
</a>
```

### CSS Classes

Already added to **frontend/css/style.css**:

```css
.notification-link {
  /* Navigation link styling */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,249,255,0.96));
}

.notification-link.has-badge {
  /* Active state when badge > 0 */
  border-color: rgba(248, 113, 113, 0.45);
}

.notification-badge {
  /* Red circular badge */
  display: inline-grid;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.notification-badge:not(.is-active) {
  /* Hidden when count is 0 */
  display: none;
}
```

### Display Logic

- **Count > 0:** Badge shows count (e.g., "5", "99+")
- **Count = 0:** Badge hidden
- **Max Display:** 99+ (configurable in `notifications.js`)

---

## 4. Real-Time Updates Flow

### Step 1: Firestore Query Execution
```javascript
const unreadQuery = query(
  collection(db, 'notifications'),
  where('isRead', '==', false)  // Only unread items
);
```

### Step 2: onSnapshot Listener
```javascript
onSnapshot(unreadQuery, (snapshot) => {
  const count = snapshot.docs.length;
  updateBadgeUI(count);  // Update DOM + app badge
});
```

### Step 3: DOM Update
```javascript
badge.textContent = '5';  // Display count
badge.classList.add('is-active');  // Show badge
```

### Step 4: App Badge Update (PWA)
```javascript
navigator.setAppBadge(5);  // Update OS app icon
```

---

## 5. Integration into Your Pages

### index.html (Dashboard)

```html
<head>
  <!-- ... existing head ... -->
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div class="topbar">
    <!-- ... existing navbar ... -->
    <div class="nav">
      <a href="index.html">Dashboard</a>
      <!-- ... more nav items ... -->
    </div>
  </div>

  <!-- ... page content ... -->

  <script type="module">
    // Notification badge auto-init
    const { injectNotificationLink, startNotificationBadge } = await import('./notifications.js');
    injectNotificationLink();
    startNotificationBadge({ collectionName: 'notifications' });
  </script>

  <script type="module" src="./app.js"></script>
</body>
```

### pages/pdd.html | pages/qcd.html | pages/qad.html

Same pattern as index.html, but import paths use `../`:

```html
<script type="module">
  const { injectNotificationLink, startNotificationBadge } = await import('../notifications.js');
  injectNotificationLink();
  startNotificationBadge({ collectionName: 'notifications' });
</script>
```

---

## 6. PWA & App Badge Support

### Browser Support

`navigator.setAppBadge()` is supported in:
- Chrome 81+ (Android, Windows, macOS)
- Edge 81+
- Firefox 64+ (Linux only)
- Safari 15.4+

### How It Works

The app badge updates your OS-level app icon:

```
Desktop:  [📦 5]  ← Badge on taskbar/dock
Mobile:   [📦]5   ← Badge on app icon
```

### Graceful Degradation

If `navigator.setAppBadge()` is not available, the system silently skips it:

```javascript
try {
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(5);  // Update OS badge
  }
} catch (error) {
  // Silently fail - non-critical feature
}
```

---

## 7. Firebase Cloud Messaging (FCM) - Optional Setup

### When to Use FCM

- You want **push notifications** even when the app is closed
- Users should get **native OS notifications** (desktop/mobile)
- You have a backend service to send FCM messages

### FCM Setup Steps

#### Step 1: Get VAPID Key

1. Go to Firebase Console → Project Settings
2. Cloud Messaging tab
3. Copy "Server key" or generate new key pair
4. Note the "Sender ID"

#### Step 2: Register Service Worker

Add to your `index.html`:

```html
<script type="module">
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => console.log('✓ Service worker registered'))
      .catch(err => console.error('✗ SW registration failed:', err));
  }
</script>
```

#### Step 3: Initialize FCM

Uncomment the `initFCM()` function in `firebase-config.js` and call it:

```javascript
import { initFCM } from './firebase-config.js';

// After page loads
initFCM();  // Requests notification permission + registers token
```

#### Step 4: Send Messages from Backend

Using Firebase Admin SDK (Node.js):

```javascript
const admin = require('firebase-admin');

await admin.messaging().send({
  token: userFCMToken,
  notification: {
    title: 'Task Assigned',
    body: 'PDD-123 needs your review'
  },
  data: {
    moldId: 'MOLD-001',
    taskType: 'review'
  }
});
```

---

## 8. Deployment Checklist

### Before Deploying to Production

- [ ] Firebase config is correct in `firebase-config.js`
- [ ] Firestore collection `notifications` has documents with `isRead` field
- [ ] CSS file linked in all HTML pages
- [ ] `notifications.js` is in `frontend/` directory
- [ ] `firebase-config.js` is in `frontend/` directory
- [ ] Service worker (if using FCM) is in `public/`
- [ ] Test in development: `npm start` or Firebase emulator

### Deploy to Firebase Hosting

```bash
# From project root
npm run build       # If you have a build step
firebase deploy
```

Or manually:

```bash
firebase deploy --only hosting
```

### Post-Deployment Testing

1. Open app in browser
2. Open DevTools Console
3. Verify logs:
   ```
   ✓ Firebase initialized successfully
   ✓ Notification link injected
   ✓ Starting notification listener (collection: "notifications")
   ```
4. Add/modify Firestore document with `isRead: false`
5. Badge count should update within 1-2 seconds

---

## 9. Troubleshooting

### Badge Not Showing

**Problem:** Badge element not visible  
**Solutions:**
- [ ] Check CSS is loaded: `frontend/css/style.css` linked in HTML
- [ ] Check `.nav` element exists in DOM
- [ ] Open DevTools → Console, look for errors
- [ ] Verify `notificationBadge` element was injected

**Debug:**
```javascript
console.log('Link:', document.getElementById('notificationLink'));
console.log('Badge:', document.getElementById('notificationBadge'));
console.log('Count:', window.NotificationBadge.getCount());
```

### Count Not Updating

**Problem:** Badge stays at 0 or doesn't refresh  
**Solutions:**
- [ ] Verify Firestore collection exists: `db.collection('notifications')`
- [ ] Ensure documents have `isRead: false` field
- [ ] Check Firestore security rules allow reads
- [ ] Verify listener is active: `window.NotificationBadge.isListening()`

**Debug:**
```javascript
// Check if listener is active
console.log('Is listening?', window.NotificationBadge.isListening());
console.log('Current count:', window.NotificationBadge.getCount());

// Manually check Firestore
const snap = await firebase.firestore().collection('notifications').where('isRead', '==', false).get();
console.log('Unread docs:', snap.size);
```

### Firebase Not Initialized

**Problem:** Console error "Firestore not initialized"  
**Solutions:**
- [ ] Check `firebase-config.js` is imported before `notifications.js`
- [ ] Verify Firebase credentials in `firebase-config.js`
- [ ] Check network tab for failed Firebase SDK loads
- [ ] Ensure no CORS issues

---

## 10. Advanced Usage

### Custom Collection & Field Name

```javascript
// Count unread from 'alerts' collection (non-standard field)
const unreadQuery = query(
  collection(db, 'alerts'),
  where('status', '==', 'unread')  // Custom field
);
```

### Multiple Badge Systems

```javascript
// Badge 1: Notifications
await startNotificationBadge({ collectionName: 'notifications' });

// Badge 2: Messages (different collection, different element)
// Create another badge in HTML with different IDs
```

### Event Listeners

```javascript
// Listen for count changes
window.addEventListener('notificationCountChanged', (event) => {
  console.log('New count:', event.detail.count);
});
```

### Programmatic Control

```javascript
// Get count anytime
const count = window.NotificationBadge.getCount();

// Check if listener is running
if (window.NotificationBadge.isListening()) {
  console.log('Badge is active');
}

// Stop listening (e.g., on logout)
window.NotificationBadge.stop();
```

---

## 11. Maintenance & Monitoring

### Performance Considerations

- **Firestore reads:** Each `onSnapshot` listener counts as a real-time listener (1 read per document change)
- **Bandwidth:** Minimal - only `isRead` field is retrieved
- **Update latency:** Typically <1 second

### Firestore Rules Example

Ensure your security rules allow reading the notifications collection:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notifications/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

### Updating Firestore Documents

To mark notifications as read (from your app):

```javascript
import { doc, updateDoc } from 'firebase/firestore';

await updateDoc(doc(db, 'notifications', 'notif-001'), {
  isRead: true
});
```

---

## 12. Summary

### What You Get

✓ Real-time notification badge count  
✓ Auto-updating from Firestore  
✓ PWA app badge support  
✓ Accessibility features (aria-live, aria-label)  
✓ Production-ready error handling  
✓ Optional FCM push notifications  
✓ Minimal dependencies (Firebase SDK only)  

### Key Files

| File | Purpose |
|------|---------|
| `frontend/firebase-config.js` | Firebase initialization |
| `frontend/notifications.js` | Badge system & listener |
| `frontend/css/style.css` | Badge styling |
| `public/firebase-messaging-sw.js` | Optional FCM handler |
| `frontend/*.html` | Updated with badge integration |

### Next Steps

1. Deploy to Firebase Hosting: `firebase deploy`
2. Add test data to `notifications` collection with `isRead: false`
3. Open app and verify badge updates in real-time
4. (Optional) Set up FCM for push notifications
5. Monitor Firestore usage in Firebase Console

---

## Support & Documentation

- **Firebase SDK v9:** https://firebase.google.com/docs/firestore
- **Modular SDK:** https://firebase.google.com/docs/web/modular-web
- **App Badge API:** https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
- **FCM:** https://firebase.google.com/docs/cloud-messaging

---

**Last Updated:** 2026-06-09  
**Version:** 1.0.0  
**Status:** Production Ready
