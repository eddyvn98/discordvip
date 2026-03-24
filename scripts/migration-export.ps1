param(
  [string]$OutputDir = ".\migration-artifacts",
  [ValidateSet("local", "production")]
  [string]$Mode = "local"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-CommandExists {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-FileExists {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing required file: $Path"
  }
}

function Resolve-ComposeArgs {
  param([string]$RunMode)
  if ($RunMode -eq "production") {
    Ensure-FileExists ".\.env.production"
    Ensure-FileExists ".\docker-compose.yml"
    Ensure-FileExists ".\docker-compose.prod.yml"
    return @("--env-file", ".env.production", "-f", "docker-compose.yml", "-f", "docker-compose.prod.yml")
  }

  Ensure-FileExists ".\.env"
  Ensure-FileExists ".\docker-compose.yml"
  return @("-f", "docker-compose.yml")
}

function Invoke-DockerCompose {
  param([string[]]$Args)
  & docker compose @Args
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose command failed: docker compose $($Args -join ' ')"
  }
}

if (-not (Test-CommandExists "docker")) {
  throw "Docker is not installed or not available in PATH."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$artifactRoot = Join-Path $OutputDir "discordvip-migration-$timestamp"
New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null

$composeArgs = Resolve-ComposeArgs -RunMode $Mode

Write-Step "Ensuring PostgreSQL service is up"
Invoke-DockerCompose -Args ($composeArgs + @("up", "-d", "postgres"))

$dbDumpPath = Join-Path $artifactRoot "db-backup.sql"
Write-Step "Exporting database to $dbDumpPath"
& docker compose @composeArgs exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > $dbDumpPath
if ($LASTEXITCODE -ne 0) {
  throw "Database dump failed."
}

Write-Step "Collecting environment files"
$envFiles = @(".env", ".env.production", ".env.demo.local")
foreach ($file in $envFiles) {
  if (Test-Path -LiteralPath $file) {
    Copy-Item -LiteralPath $file -Destination (Join-Path $artifactRoot $file) -Force
  }
}

Write-Step "Collecting compose and runtime files"
$includePaths = @(
  "docker-compose.yml",
  "docker-compose.prod.yml",
  "package.json",
  "package-lock.json",
  ".dockerignore",
  "apps",
  "nginx",
  "scripts",
  "cloudflared",
  "docs"
)

foreach ($path in $includePaths) {
  if (Test-Path -LiteralPath $path) {
    Copy-Item -LiteralPath $path -Destination (Join-Path $artifactRoot $path) -Recurse -Force
  }
}

$manifest = [ordered]@{
  exported_at = (Get-Date).ToString("o")
  mode        = $Mode
  source_path = (Get-Location).Path
  files       = (Get-ChildItem -LiteralPath $artifactRoot -Recurse | Select-Object -ExpandProperty FullName)
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $artifactRoot "manifest.json") -Encoding UTF8

$zipPath = Join-Path $OutputDir "discordvip-migration-$timestamp.zip"
Write-Step "Creating archive: $zipPath"
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $artifactRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal

Write-Step "Done"
Write-Host "Migration package created:"
Write-Host "  $zipPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next step on new machine:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\migration-import.ps1 -ArchivePath `"$zipPath`" -DestinationPath <path>"
