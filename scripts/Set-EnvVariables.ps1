# Define the paths to your .env files
$envFilePaths = @(
    "D:\app_dev\aidream-current\.env",
    "D:\app_dev\ai-matrx-admin\.env.local"
)

# Initialize a hashtable to store environment variables
$envVariables = @{}

# Function to parse .env files and update the hashtable
function Parse-EnvFile {
    param (
        [string]$filePath
    )

    # Check if the file exists
    if (-Not (Test-Path -Path $filePath)) {
        Write-Warning "The file '$filePath' does not exist."
        return
    }

    # Read the content of the .env file
    $envContent = Get-Content -Path $filePath

    # Iterate over each line in the .env file
    foreach ($line in $envContent) {
        # Skip empty lines and comments
        if (-not [string]::IsNullOrWhiteSpace($line) -and -not $line.TrimStart().StartsWith("#")) {
            # Split the line into key and value
            $parts = $line -split "=", 2
            if ($parts.Count -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()

                # Update the hashtable with the key-value pair
                $envVariables[$key] = $value
            } else {
                Write-Warning "Skipping invalid line: $line"
            }
        }
    }
}

# Parse each .env file
foreach ($envFilePath in $envFilePaths) {
    Parse-EnvFile -filePath $envFilePath
}

# Set the environment variables for the current process and permanently for the user
foreach ($key in $envVariables.Keys) {
    $value = $envVariables[$key]

    # Set for the current process
    [System.Environment]::SetEnvironmentVariable($key, $value, [System.EnvironmentVariableTarget]::Process)

    # Set permanently for the user
    [System.Environment]::SetEnvironmentVariable($key, $value, [System.EnvironmentVariableTarget]::User)
}
