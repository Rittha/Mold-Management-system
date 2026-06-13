# Notification System - Visual Demo & Quick Start

## 🎯 What You'll See

### Bell Icon in Top-Right Navbar
```
┌─────────────────────────────────────────────────┐
│  Mold System  │ Dashboard PDD QCD QAD  [🔔 1] │
│               │                                  │
└─────────────────────────────────────────────────┘
                                        ↑
                                   Bell Icon
                                  Red Badge: 1
```

### Click Bell → Notification Dropdown Opens

```
┌────────────────────────────────────┐
│  Notifications         All  Unread │
├────────────────────────────────────┤
│  New                               │
│ ┌────────────────────────────────┐ │
│ │ ⚠️                             │ │ ← Avatar (Red)
│ │   MOLD-1781267657003 (E-0539)  │ │ ← Bold Mold ID
│ │   BURR issue reported...       │ │ ← Message Text
│ │   5 mins ago                   │ │ ← Timestamp
│ │                           ● │ │ ← Blue Unread Dot
│ └────────────────────────────────┘ │
│                                    │
│  Today                             │
│ ┌────────────────────────────────┐ │
│ │ ✓                              │ │ ← Avatar (Green)
│ │   PD-169 (PD-169)              │ │ ← Regular text (read)
│ │   has been marked as QC Pass   │ │
│ │   2 hours ago                  │ │
│ └────────────────────────────────┘ │
│                                    │
├────────────────────────────────────┤
│  View previous notifications       │ ← Footer Button
└────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. **See It In Action (Right Now)**
The system is already running with **mock data**:
- Open `http://localhost:3000` (or your server)
- Look in top-right corner - you'll see the bell icon with **1** (unread count)
- Click the bell to open the dropdown

### 2. **Test the Features**
Try these actions:

**Click a notification item:**
- The blue dot disappears
- Badge count decreases (1 → 0)
- Item background returns to white

**Switch between filters:**
- Click "All" tab - see 3 notifications (1 unread + 2 read)
- Click "Unread" tab - see only 1 notification
- Unread tab shows count: "Unread (1)"

**Click outside dropdown:**
- Dropdown closes
- Bell button is no longer highlighted

**Click "View previous notifications":**
- Console logs: "Navigate to full notifications page"
- (Ready for you to implement a full page link)

## 📱 Mock Data Details

### Notification 1 (Unread)
```
Avatar:    ⚠️  Red (#ef4444)
Mold ID:   MOLD-1781267657003
Mold Name: (E-0539)
Message:   BURR issue reported, pending QCD inspection
Time:      5 mins ago
Status:    UNREAD ← Shows blue dot
```

### Notification 2 (Read)
```
Avatar:    ✓  Green (#10b981)
Mold ID:   PD-169
Mold Name: (PD-169)
Message:   has been marked as QC Pass by Operator
Time:      2 hours ago
Status:    READ (no blue dot)
```

### Notification 3 (Read)
```
Avatar:    →  Blue (#3b82f6)
Mold ID:   MOLD-1781267657015
Mold Name: (E-0540)
Message:   has been moved to QCD for inspection
Time:      1 day ago
Status:    READ (no blue dot)
```

## 🎨 Time Grouping Logic

The dropdown automatically groups notifications by time:

| Group | When | Example |
|-------|------|---------|
| **New** | Last 1 hour | "5 mins ago", "30 mins ago" |
| **Today** | Same day, but older than 1 hour | "2 hours ago", "5 hours ago" |
| **Earlier** | Older than today | "1 day ago", "5 days ago" |

## 🔌 Integration Checklist

- [x] Bell icon displays in navbar (instead of text button)
- [x] Red badge shows unread count
- [x] Click bell to open/close dropdown
- [x] Click outside to close
- [x] Notifications grouped by time
- [x] Avatar colors match issue types
- [x] Relative timestamps work
- [x] Click to mark as read works
- [x] Filter tabs work (All / Unread)
- [x] Smooth animations
- [x] Responsive design
- [x] Accessibility features (ARIA)

## 🔄 Switch to Real Firestore Data

When you have Firestore data ready:

### Step 1: Update each HTML page
Find this code (in `index.html`, `pdd.html`, `qcd.html`, `qad.html`):
```javascript
startNotificationBadge({ 
  collectionName: 'notifications',
  useMockData: true,  // ← CHANGE THIS
  autoInject: true
});
```

Change to:
```javascript
startNotificationBadge({ 
  collectionName: 'notifications',
  useMockData: false,  // ← Switch to real data
  autoInject: true
});
```

### Step 2: Ensure Firestore Collection Exists
In Firebase Console, create collection:
```
Collection: notifications
Documents:
  - id: notif-001
    mold_id: "MOLD-xxx"
    mold_name: "E-0539"
    message: "..."
    timestamp: (Firestore Timestamp)
    isRead: false
    avatar_color: "#ef4444"
    avatar_icon: "⚠️"
```

### Step 3: Test
Reload the page - bell icon should now show real notifications from Firestore!

## 💡 Key Features Explained

### 1. **Auto Time Formatting**
```javascript
// Your code shows these automatically:
"5 mins ago"      // If < 60 mins old
"2 hours ago"     // If < 24 hours old
"1 day ago"       // If older than today
"5 days ago"      // If more than 1 day
```

### 2. **Mark As Read**
```javascript
// Click notification → If unread:
notification.isRead = true  // Local update
updateFirestore()           // Sync to Firebase
badge.count--               // Badge updates
updateUI()                  // Dropdown re-renders
```

### 3. **Filter State**
```javascript
// "All" tab
shows all 3 notifications

// "Unread" tab  
shows only 1 notification with "Unread (1)"
```

### 4. **Dropdown State**
```javascript
// Bell button controls dropdown.style.display
click bell → display = 'block'
click bell again → display = 'none'
click outside → display = 'none'
```

## 📊 Expected Badge Behavior

```
Initial state:
┌─────────────────┐
│ Bell: [🔔 1]    │  ← 1 unread = shows "1"
└─────────────────┘

After clicking first notification (mark as read):
┌─────────────────┐
│ Bell: [🔔]      │  ← 0 unread = badge hidden
└─────────────────┘

With 15 unread:
┌─────────────────┐
│ Bell: [🔔 15]   │  ← Shows "15"
└─────────────────┘

With 150 unread:
┌─────────────────┐
│ Bell: [🔔 99+]  │  ← Capped at "99+"
└─────────────────┘
```

## 🎯 Browser Compatibility

✅ Chrome/Edge 88+
✅ Firefox 87+
✅ Safari 14+
✅ All modern browsers

PWA Badge (app notification):
- Optional feature
- Falls back gracefully if not supported
- Works on Android Chrome, Edge

## 📝 Next Steps

1. **Right now:** Click bell and explore!
2. **Next:** Switch to real Firestore data
3. **Later:** Create full notifications history page
4. **Future:** Add notification filtering by type

## ❓ Common Questions

**Q: Why is there a red "1" badge?**
A: Mock data has 1 unread notification. Click it to mark as read and badge disappears.

**Q: Can I customize the colors?**
A: Yes! Edit `MOCK_NOTIFICATIONS` in `notifications.js`, change `avatar_color` field.

**Q: Can I customize the icons?**
A: Yes! Edit `avatar_icon` field - use any emoji or unicode character.

**Q: Where's the real Firestore data?**
A: Change `useMockData: false` in HTML files and ensure `notifications` collection exists in Firestore.

**Q: How do I add new notifications?**
A: If using real Firestore, add documents to the `notifications` collection. If using mock data, edit `MOCK_NOTIFICATIONS` array.

**Q: Does it work offline?**
A: With mock data, yes. With real Firestore, it needs internet but works with offline persistence enabled.

---

**Status:** ✅ Ready to Use  
**Current Mode:** 🎭 Mock Data (Demo)  
**Next:** 🔄 Switch to Real Firestore (when ready)
