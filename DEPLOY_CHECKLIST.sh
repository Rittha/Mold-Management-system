#!/bin/bash
# Quick Deployment Checklist for Notification Badge System
# Run this before deploying to production

echo "📋 Notification System Deployment Checklist"
echo "=============================================="
echo ""

# Check files exist
echo "✓ Checking files..."
files=(
  "frontend/firebase-config.js"
  "frontend/notifications.js"
  "frontend/css/style.css"
  "frontend/index.html"
  "frontend/pages/pdd.html"
  "frontend/pages/qcd.html"
  "frontend/pages/qad.html"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
  fi
done

echo ""
echo "✓ Configuration Checklist:"
echo "  - [ ] Firebase Project ID: mold-management-439a8"
echo "  - [ ] Firestore Collection: notifications"
echo "  - [ ] Field to query: isRead (boolean)"
echo "  - [ ] Query: isRead == false"
echo ""

echo "✓ Testing Checklist:"
echo "  - [ ] Run: npm start"
echo "  - [ ] Open: http://localhost:3000"
echo "  - [ ] Check DevTools Console for: '✓ Firebase initialized successfully'"
echo "  - [ ] Check DevTools Console for: '✓ Notification link injected'"
echo "  - [ ] Check DevTools Console for: '✓ Starting notification listener'"
echo ""

echo "✓ Deployment:"
echo "  - [ ] firebase deploy"
echo "  - [ ] Verify production build works"
echo "  - [ ] Test in production at: https://mold-management-439a8.web.app"
echo ""

echo "✓ Post-Deployment Verification:"
echo "  - [ ] Badge appears in navigation"
echo "  - [ ] Add document with isRead: false to Firestore"
echo "  - [ ] Badge count updates within 2 seconds"
echo "  - [ ] Mark document as isRead: true"
echo "  - [ ] Badge count decreases"
echo ""

echo "🎉 Ready to deploy!"
