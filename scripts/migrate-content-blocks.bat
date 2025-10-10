@echo off
echo 🚀 Content Blocks Migration
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo ❌ Error: .env.local file not found!
    echo Please create .env.local with your Supabase credentials:
    echo    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    echo    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    pause
    exit /b 1
)

echo ✅ Found .env.local file
echo.

REM Run the migration
echo 🔄 Running migration script...
npx tsx scripts/migrate-content-blocks.ts

if %errorlevel% equ 0 (
    echo.
    echo 🎉 Migration completed successfully!
    echo.
    echo Next steps:
    echo 1. Check your Supabase dashboard to verify the data
    echo 2. Set NEXT_PUBLIC_USE_DATABASE_CONTENT_BLOCKS=true in .env.local
    echo 3. Test the content blocks in your application
) else (
    echo.
    echo ❌ Migration failed with error code: %errorlevel%
)

echo.
pause
