param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$OutputDir = "",
  [string]$BackupPrefix = "stock-app-neon",
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

function Get-DatabaseUrlFromEnv {
  param([string]$EnvPath)

  if (-not (Test-Path -LiteralPath $EnvPath)) {
    throw ".env nuk u gjet te $EnvPath"
  }

  $line = Get-Content -LiteralPath $EnvPath |
    Where-Object { $_ -match '^DATABASE_URL=' } |
    Select-Object -First 1

  if (-not $line) {
    throw "DATABASE_URL nuk u gjet ne .env"
  }

  $value = $line.Substring("DATABASE_URL=".Length).Trim()

  if (
    ($value.StartsWith('"') -and $value.EndsWith('"')) -or
    ($value.StartsWith("'") -and $value.EndsWith("'"))
  ) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  if (-not $value) {
    throw "DATABASE_URL eshte bosh ne .env"
  }

  return $value
}

function Get-PgDumpPath {
  $candidates = @(
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "pg_dump.exe i PostgreSQL 17+ nuk u gjet."
}

function Resolve-OutputDir {
  param([string]$RequestedOutputDir)

  if ($RequestedOutputDir) {
    return $RequestedOutputDir
  }

  $googleDriveDir = "G:\My Drive\Neon Backups"
  if (Test-Path -LiteralPath "G:\My Drive") {
    return $googleDriveDir
  }

  return (Join-Path $env:USERPROFILE "Desktop\neon-backups")
}

function Remove-OldBackups {
  param(
    [string]$Directory,
    [string]$Prefix,
    [int]$DaysToKeep
  )

  if ($DaysToKeep -le 0) {
    return 0
  }

  $cutoffDate = (Get-Date).AddDays(-$DaysToKeep)
  $oldBackups = Get-ChildItem -LiteralPath $Directory -Filter "$Prefix-*.dump" -File |
    Where-Object { $_.LastWriteTime -lt $cutoffDate }

  $removedCount = 0
  foreach ($backup in $oldBackups) {
    Remove-Item -LiteralPath $backup.FullName -Force
    $removedCount++
  }

  return $removedCount
}

$envPath = Join-Path $ProjectRoot ".env"
$databaseUrl = Get-DatabaseUrlFromEnv -EnvPath $envPath
$pgDumpPath = Get-PgDumpPath
$resolvedOutputDir = Resolve-OutputDir -RequestedOutputDir $OutputDir

if (-not (Test-Path -LiteralPath $resolvedOutputDir)) {
  New-Item -ItemType Directory -Path $resolvedOutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupPath = Join-Path $resolvedOutputDir "$BackupPrefix-$timestamp.dump"

Write-Host "Po krijohet backup-i..."
Write-Host "Destinacioni: $backupPath"

& $pgDumpPath -Fc $databaseUrl -f $backupPath

if (-not (Test-Path -LiteralPath $backupPath)) {
  throw "Backup-i nuk u krijua."
}

$removedBackups = Remove-OldBackups -Directory $resolvedOutputDir -Prefix $BackupPrefix -DaysToKeep $RetentionDays

Write-Host "Backup-i u krijua me sukses."
Write-Host $backupPath
Write-Host "Backup-et e fshira me te vjetra se $RetentionDays dite: $removedBackups"
