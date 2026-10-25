# run-dev.ps1
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

# Start FastAPI in a separate PowerShell window
Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location -LiteralPath '$backend'; uv run fastapi dev main.py"
)

# Start Vite/React in a separate PowerShell window
Start-Process powershell.exe -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location -LiteralPath '$frontend'; npm run dev"
)