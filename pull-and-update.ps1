# Use pullupdate

# Stashes changes, pull git, install and update pnpm, start dev server.
# Set-Alias pullupdate "D:\app_dev\ai-matrx-admin\pull-and-update.ps1"

cls

# Function to run a command and check for success
function Run-Command {
    param (
        [string]$command,
        [string]$errorMessage
    )

    Write-Host "Running command: $command" -ForegroundColor Cyan
    Invoke-Expression $command

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: $errorMessage" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# Check git status to see if there are uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus -ne "") {
    # If there are uncommitted changes, stash them
    Write-Host "Uncommitted changes found, stashing changes..." -ForegroundColor Yellow
    Run-Command "git stash" "Failed to stash changes"
}

# Pull the latest changes from the remote repository
Run-Command "git pull" "Failed to pull changes or there are conflicts. Resolve conflicts manually."

# Check if there are any merge conflicts
$conflicts = git diff --name-only --diff-filter=U
if ($conflicts) {
    Write-Host "Merge conflicts detected. Resolve them before proceeding." -ForegroundColor Red
    exit 1
}

# Install and update pnpm dependencies
Write-Host "Installing and updating pnpm dependencies..." -ForegroundColor Cyan
Run-Command "pnpm install" "Failed to install dependencies"
Run-Command "pnpm update" "Failed to update dependencies"

# Start the development server
Write-Host "Starting development server..." -ForegroundColor Green
Run-Command "pnpm run dev" "Failed to start the development server"
