#!/bin/bash

# Four Worlds Battleground - Android APK Setup Script

set -e

echo "🎮 Four Worlds Battleground - Android Setup"
echo "============================================"
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ npm not found. Please install Node.js"
    exit 1
fi

if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Please install JDK 11+"
    exit 1
fi

echo "✓ Prerequisites OK"
echo ""

# Install Capacitor
echo "📦 Installing Capacitor..."
npm install @capacitor/core @capacitor/android @capacitor/splash-screen --save

# Initialize Capacitor
echo "⚙️  Initializing Capacitor..."
npx cap init \
    --web-dir="." \
    --npm-client="npm" \
    --package-type="json"

# Add Android platform
echo "🤖 Adding Android platform..."
npx cap add android

# Sync assets
echo "🔄 Syncing web assets to Android project..."
npx cap sync android

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. cd android"
echo "2. ./gradlew assembleDebug"
echo "3. adb install app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "For more details, see docs/APK_BUILD_GUIDE.md"
