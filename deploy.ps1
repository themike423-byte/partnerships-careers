# PowerShell script to help prepare for deployment
# Run this with: .\deploy.ps1

Write-Host "🚀 Preparing for deployment..." -ForegroundColor Green
Write-Host ""

# Check if git is initialized
if (-not (Test-Path .git)) {
    Write-Host "⚠️  Git not initialized. Initializing..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "✅ Git initialized" -ForegroundColor Green
}

# Check for serviceAccountKey.json (should be in .gitignore)
if (Test-Path serviceAccountKey.json) {
    Write-Host "✅ Service account key found (will be ignored by git)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Service account key not found (this is OK if you're not migrating)" -ForegroundColor Yellow
}

# Check package.json
if (Test-Path package.json) {
    Write-Host "✅ package.json found" -ForegroundColor Green
} else {
    Write-Host "❌ package.json not found!" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Test build
Write-Host ""
Write-Host "🔨 Testing build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Push to GitHub:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host "   git commit -m 'Ready for deployment'" -ForegroundColor Gray
    Write-Host "   git push origin main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Go to Vercel and import your GitHub repository" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Add environment variables in Vercel (see DEPLOY_TO_PRODUCTION.md)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Build failed! Fix errors before deploying." -ForegroundColor Red
    exit 1
}

