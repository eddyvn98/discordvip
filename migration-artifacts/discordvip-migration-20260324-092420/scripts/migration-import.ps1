param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath,
  [string]$DestinationPath = ".\discordvip-restored",
  [ValidateSet("local", "production")]
  [string]$Mode = "local",
  [switch]$SkipRestore
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-FileExists {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing required file: $Path"
  }
}

function Invoke-DockerCompose {
  param(
    [string[]]$ComposeArgs,
    [string[]]$Args
  )

  & docker compose @ComposeArgs @Args
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose command failed: docker compose $($ComposeArgs -join ' ') $($Args -join ' ')"
  }
}

function Resolve-ComposeArgs {
  param(
    [string]$RunMode
  )

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

Ensure-FileExists $ArchivePath

Write-Step "Preparing destination folder: $DestinationPath"
New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null

Write-Step "Extracting archive"
Expand-Archive -LiteralPath $ArchivePath -DestinationPath $DestinationPath -Force

$manifestPath = Join-Path $DestinationPath "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Invalid migration archive: manifest.json not found."
}

$projectPath = $DestinationPath
$dbDumpPath = Join-Path $projectPath "db-backup.sql"
Ensure-FileExists $dbDumpPath

Push-Location $projectPath
try {
  $composeArgs = Resolve-ComposeArgs -RunMode $Mode

  Write-Step "Building and starting Docker services"
  Invoke-DockerCompose -ComposeArgs $composeArgs -Args @("up", "-d", "--build")

  if (-not $SkipRestore) {
    Write-Step "Waiting for PostgreSQL to become ready"
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
      & docker compose @composeArgs exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | Out-Null
      if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
      }
      Start-Sleep -Seconds 2
    }
    if (-not $ready) {
      throw "PostgreSQL is not ready after waiting."
    }

    Write-Step "Restoring database from db-backup.sql"
    Get-Content -LiteralPath $dbDumpPath | & docker compose @composeArgs exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
    if ($LASTEXITCODE -ne 0) {
      throw "Database restore failed."
    }
  } else {
    Write-Step "Skipping database restore as requested"
  }

  Write-Step "Done"
  Write-Host "Project restored at:"
  Write-Host "  $projectPath" -ForegroundColor Green
  Write-Host ""
  Write-Host "Useful checks:"
  Write-Host "  docker compose $($composeArgs -join ' ') ps"
  Write-Host "  docker compose $($composeArgs -join ' ') logs -f app-server"
}
finally {
  Pop-Location
}
