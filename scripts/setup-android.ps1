# Four Worlds Battleground - Android APK Setup Script (Windows)

Write-Host "🎮 Four Worlds Battleground - Android Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "✓ Checking prerequisites..." -ForegroundColor Yellow

$prerequisites = @(
    @{ name = "Node.js"; cmd = "node" },
    @{ name = "npm"; cmd = "npm" },
    @{ name = "Java"; cmd = "java" }
)

foreach ($prereq in $prerequisites) {
    try {
        $null = & $prereq.cmd --version 2>$null
        Write-Host "✓ $($prereq.name) found" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ $($prereq.name) not found. Please install it." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Install Capacitor
Write-Host "📦 Installing Capacitor..." -ForegroundColor Yellow
npm install "@capacitor/core" "@capacitor/android" "@capacitor/splash-screen" --save

# Initialize Capacitor
Write-Host "⚙️  Initializing Capacitor..." -ForegroundColor Yellow
npx @capacitor/cli init --web-dir="." --npm-client="npm" --package-type="json"

# Add Android platform
Write-Host "🤖 Adding Android platform..." -ForegroundColor Yellow
npx @capacitor/cli add android

# Sync assets
Write-Host "🔄 Syncing web assets to Android project..." -ForegroundColor Yellow
npx @capacitor/cli sync android

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. cd android"
Write-Host "2. gradlew.bat assembleDebug"
Write-Host "3. adb install app\build\outputs\apk\debug\app-debug.apk"
Write-Host ""
Write-Host "For more details, see docs\APK_BUILD_GUIDE.md" -ForegroundColor Cyan
