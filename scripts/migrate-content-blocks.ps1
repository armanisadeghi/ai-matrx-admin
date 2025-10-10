# PowerShell script to run the content blocks migration
# This ensures proper environment loading and error handling

Write-Host "🚀 Starting Content Blocks Migration..." -ForegroundColor Green
Write-Host ""

# Check if .env.local exists
$envFile = Join-Path $PSScriptRoot "..\\.env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: .env.local file not found!" -ForegroundColor Red
    Write-Host "Please create .env.local with your Supabase credentials:" -ForegroundColor Yellow
    Write-Host "   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url" -ForegroundColor Gray
    Write-Host "   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Found .env.local file" -ForegroundColor Green

# Check if tsx is available
try {
    $tsxVersion = npx tsx --version 2>$null
    Write-Host "✅ tsx is available (version: $tsxVersion)" -ForegroundColor Green
} catch {
    Write-Host "❌ tsx not found. Installing..." -ForegroundColor Yellow
    npm install -g tsx
}

# Change to the project root directory
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

Write-Host ""
Write-Host "📁 Working directory: $projectRoot" -ForegroundColor Cyan
Write-Host ""

# Run the migration script
try {
    Write-Host "🔄 Running migration script..." -ForegroundColor Yellow
    npx tsx scripts/migrate-content-blocks.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Check your Supabase dashboard to verify the data" -ForegroundColor Gray
        Write-Host "2. Set NEXT_PUBLIC_USE_DATABASE_CONTENT_BLOCKS=true in .env.local" -ForegroundColor Gray
        Write-Host "3. Test the content blocks in your application" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
