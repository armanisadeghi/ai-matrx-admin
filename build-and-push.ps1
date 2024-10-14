param (
    [string]$commitMessage
)

# Function to run a command and check for success
function Run-Command {
    param (
        [string]$command
    )

    Write-Host "Running command: $command" -ForegroundColor Cyan
    Invoke-Expression $command

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Command failed: $command" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# Check git status to ensure you're not behind
Run-Command "git status"

# Add all files to staging
Run-Command "git add ."

# Commit changes with the provided message
if (-not $commitMessage) {
    Write-Host "No commit message provided." -ForegroundColor Red
    exit 1
}
Run-Command "git commit -m `"$commitMessage`""

# Push the changes
Run-Command "git push"

# Build the project using pnpm
Run-Command "pnpm run build"

Write-Host "All steps completed successfully!" -ForegroundColor Green
