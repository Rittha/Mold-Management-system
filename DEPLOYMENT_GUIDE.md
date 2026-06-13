# Notification Badge System - File Structure & Quick Reference

## 📁 Project Directory Structure

```
d:\PROJECT\Mold system management\
│
├── frontend/
│   ├── firebase-config.js                 ✓ NEW: Firebase init & config
│   ├── notifications.js                   ✓ UPDATED: Enhanced badge system
│   ├── firebase.js                        (Legacy - can keep or remove)
│   ├── app.js                             (Existing - no changes)
│   ├── index.html                         ✓ UPDATED: Added notification module
│   │
│   ├── css/
│   │   ├── style.css                      ✓ UPDATED: Added badge styling
│   │   └── script.js                      (No changes)
│   │
│   └── pages/
│       ├── pdd.html                       ✓ UPDATED: Added notification module
│       ├── qcd.html                       ✓ UPDATED: Added notification module
│       ├── qad.html                       ✓ UPDATED: Added notification module
│       └── auth-guard.js                  (No changes)
│
├── public/
│   ├── index.html                         (Existing)
│   ├── firebase-messaging-sw.js           ✓ NEW: Optional FCM service worker
│   └── ... other assets ...
│
├── NOTIFICATION_SYSTEM_GUIDE.md           ✓ NEW: Complete implementation guide
├── DEPLOYMENT_GUIDE.md                    ✓ NEW: This file
├── DEPLOY_CHECKLIST.sh                    ✓ NEW: Pre-deployment checklist
│
└── ... (other project files)
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Deploy Files

Files are already in place:
```
✓ frontend/firebase-config.js
✓ frontend/notifications.js
✓ frontend/css/style.css (styling added)
✓ public/firebase-messaging-sw.js (optional)
```

### Step 2: Test Locally

```bash
# Start development server
npm start

# Open browser
# http://localhost:3000

# Check console for:
# ✓ Firebase initialized successfully
# ✓ Notification link injected
# ✓ Starting notification listener
```

### Step 3: Deploy to Production

```bash
# Deploy to Firebase Hosting
firebase deploy

# Verify at:
# https://mold-management-439a8.web.app
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────┐
│   Firestore Collection: │
│     notifications       │
│  { id, title, isRead }  │
└────────────┬────────────┘
             │
             │ onSnapshot listener
             │ where isRead == false
             │
┌────────────v──────────────────┐
│  notifications.js              │
│  ├─ Count unread docs          │
│  ├─ Update count state         │
│  └─ Dispatch UI updates        │
└────────────┬──────────────────┘
             │
      ┌──────┴───────┐
      │              │
      v              v
  ┌──────────┐  ┌─────────────┐
  │  DOM     │  │  App Badge  │
  │  Badge   │  │  (PWA)      │
  │ "Notif   │  │  OS Icon    │
  │  (5)"    │  │  Badge: 5   │
  └──────────┘  └─────────────┘
```

---

## 📝 HTML Integration Examples

### Example 1: Minimal Integration

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Nav with notification badge -->
  <nav class="nav">
    <a href="/dashboard">Dashboard</a>
    <!-- Notification link injected here automatically -->
  </nav>

  <!-- Page content -->
  <div class="container">
    <h1>Welcome</h1>
  </div>

  <!-- Auto-start notification system -->
  <script type="module">
    import { injectNotificationLink, startNotificationBadge } from './notifications.js';
    
    // Inject UI element
    injectNotificationLink();
    
    // Start listening (auto-connects to Firestore)
    await startNotificationBadge({
      collectionName: 'notifications',
      enableAppBadge: true
    });
  </script>
</body>
</html>
```

### Example 2: Advanced Integration with Manual Control

```html
<script type="module">
  import { startNotificationBadge, stopNotificationBadge } from './notifications.js';

  let unsubscribe = null;

  // Start on page load
  async function initNotifications() {
    unsubscribe = await startNotificationBadge({
      collectionName: 'notifications',
      autoInject: true
    });
  }

  // Stop on logout
  function handleLogout() {
    if (unsubscribe) unsubscribe();
    window.NotificationBadge.stop();
  }

  // Listen for count changes
  window.addEventListener('notificationCountChanged', (event) => {
    console.log('Notification count:', event.detail.count);
    // Trigger sound/toast notification here if desired
  });

  initNotifications();
</script>
```

---

## 🔧 Configuration Reference

### Default Configuration (notifications.js)

```javascript
const CONFIG = {
  COLLECTION_NAME: 'notifications',    // Firestore collection to query
  BADGE_ID: 'notificationBadge',       // DOM element ID for count display
  LINK_ID: 'notificationLink',         // DOM element ID for link
  NAV_SELECTOR: '.nav',                // CSS selector for nav container
  ENABLE_APP_BADGE: true,              // Update PWA app badge
  UNREAD_FIELD: 'isRead',              // Field name to query (== false)
  MAX_BADGE_DISPLAY: 99,               // Max count before "99+"
};
```

### Override Configuration

```javascript
// Option 1: Via function parameter
await startNotificationBadge({
  collectionName: 'alerts',
  enableAppBadge: false,
  autoInject: true
});

// Option 2: Modify CONFIG directly (advanced)
// Not recommended - use function parameters instead
```

---

## 🔌 API Reference

### Exported Functions

```javascript
// Start listening (auto-injects element)
startNotificationBadge(options) → Promise<Function|null>

// Manually inject link element
injectNotificationLink(options) → HTMLElement|null

// Stop listening
stopNotificationBadge() → void
```

### Global API (via window.NotificationBadge)

```javascript
window.NotificationBadge.start(options)        // Start listening
window.NotificationBadge.stop()                // Stop listening
window.NotificationBadge.getCount()            // Get current count → number
window.NotificationBadge.isListening()         // Check if active → boolean
window.NotificationBadge.inject(options)       // Inject link element
```

### Events

```javascript
window.addEventListener('notificationCountChanged', (event) => {
  console.log(event.detail.count);  // Updated count
});
```

---

## 📱 Firestore Document Structure

### Minimum Required

```javascript
{
  // Can be any unique ID
  id: "doc-001",
  
  // Required: Boolean field to query
  isRead: false,
  
  // Everything else is optional
  title: "Task assigned",
  message: "...",
  timestamp: new Date(),
  userId: "user-123"
}
```

### Supported Collections

Any collection with an `isRead` field:

```
✓ notifications
✓ alerts
✓ messages
✓ tasks
✓ events
✓ ... or any collection with isRead field
```

### Marking as Read

```javascript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase-config.js';

// Mark one notification as read
await updateDoc(doc(db, 'notifications', 'doc-001'), {
  isRead: true
});

// Badge count decreases automatically
```

---

## ✅ Testing Checklist

### Local Testing

- [ ] `npm start` runs without errors
- [ ] App loads at `http://localhost:3000`
- [ ] Console shows: "✓ Firebase initialized successfully"
- [ ] Console shows: "✓ Notification link injected"
- [ ] Navigation shows "Notifications" link
- [ ] Console shows: "✓ Starting notification listener"

### Firestore Integration Testing

- [ ] Open Firestore Console → notifications collection
- [ ] Add document with `isRead: false`
- [ ] Refresh app (or wait <2 sec if real-time)
- [ ] Badge displays count
- [ ] Update document to `isRead: true`
- [ ] Badge count decreases

### Cross-Browser Testing

- [ ] Chrome/Edge (Windows)
- [ ] Firefox (Windows/Linux)
- [ ] Safari (macOS/iOS)
- [ ] Chrome Mobile (Android)

### Accessibility Testing

- [ ] Screen reader announces badge count
- [ ] Tab navigation includes notification link
- [ ] ARIA labels present on badge elements

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Badge not visible | CSS not loaded | Verify `css/style.css` is linked in HTML |
| Count stays at 0 | Firestore not connected | Check Firebase config, verify collection exists |
| Count doesn't update | Listener not active | Check console for errors, verify `isRead` field exists |
| Import errors | Wrong file path | Use `../notifications.js` in pages/, `./notifications.js` in root |
| Firebase not initialized | Config missing | Verify `firebase-config.js` is imported before `notifications.js` |

---

## 📚 Related Documentation

- **Full Guide:** See `NOTIFICATION_SYSTEM_GUIDE.md`
- **Pre-Deploy Checklist:** See `DEPLOY_CHECKLIST.sh`
- **Firebase Docs:** https://firebase.google.com/docs
- **Modular SDK:** https://firebase.google.com/docs/web/modular-web
- **Firestore:** https://firebase.google.com/docs/firestore/data-model

---

## 🎯 Summary

| Aspect | Details |
|--------|---------|
| **Type** | Real-time notification badge |
| **Source** | Firestore collection (`notifications`) |
| **Update Rate** | <1 second (real-time) |
| **Query** | `isRead == false` |
| **Display** | DOM badge + optional PWA app badge |
| **Fallback** | Graceful degradation if features unavailable |
| **Performance** | Minimal (1 real-time listener) |
| **Browser Support** | All modern browsers (Chrome 81+, Firefox, Safari, Edge) |
| **Dependencies** | Firebase SDK v9 only |

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** 2026-06-09
