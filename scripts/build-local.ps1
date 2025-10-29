# PowerShell script for local builds with increased memory
$env:NODE_OPTIONS = "--max-old-space-size=16384"

Write-Host "🚀 Starting local build with 16GB heap..." -ForegroundColor Cyan
Write-Host "NODE_OPTIONS: $env:NODE_OPTIONS" -ForegroundColor Yellow

# Generate manifest
Write-Host "`n📋 Generating manifest..." -ForegroundColor Green
ts-node scripts/generate-manifest.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Manifest generation failed" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Build Next.js
Write-Host "`n🔨 Building Next.js app..." -ForegroundColor Green
next build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n✅ Build completed successfully!" -ForegroundColor Green

