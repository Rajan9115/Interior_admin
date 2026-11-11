<#
.SYNOPSIS
  MAMA INTERIOR CMS - Automated PostgreSQL Database Backup Script
.DESCRIPTION
  Safely dumps the PostgreSQL database to a timestamped compressed backup file.
.NOTES
  Usage: powershell -File scripts/backup-db.ps1
#>

param (
    [string]$BackupDir = "./backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "mamainterior_backup_$Timestamp.sql"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MAMA INTERIOR - Database Backup Utility" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Load DATABASE_URL from .env if present
$DbUrl = $env:DATABASE_URL
if (-not $DbUrl -and (Test-Path ".env")) {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*DATABASE_URL\s*=\s*["'']?(.*?)["'']?\s*$') {
            $DbUrl = $matches[1]
        }
    }
}

if (-not $DbUrl) {
    Write-Error "DATABASE_URL environment variable is not defined and could not be loaded from .env."
    exit 1
}

Write-Host "Destination: $BackupFile" -ForegroundColor Yellow

try {
    # Execute pg_dump using connection string
    pg_dump --clean --if-exists --no-owner --no-privileges -d "$DbUrl" -f "$BackupFile"
    if ($LASTEXITCODE -eq 0) {
        $FileSize = (Get-Item $BackupFile).Length / 1KB
        Write-Host "Database backup completed successfully!" -ForegroundColor Green
        Write-Host "File size: $([math]::Round($FileSize, 2)) KB" -ForegroundColor Green
    } else {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "Backup failed: $_"
    exit 1
}

