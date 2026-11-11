<#
.SYNOPSIS
  MAMA INTERIOR CMS - PostgreSQL Database Restore Utility
.DESCRIPTION
  Safely restores a SQL backup dump to the target PostgreSQL database.
.NOTES
  Usage: powershell -File scripts/restore-db.ps1 -BackupFile ./backups/mamainterior_backup_YYYYMMDD_HHMMSS.sql
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Specified backup file does not exist: $BackupFile"
    exit 1
}

Write-Host "==========================================" -ForegroundColor Red
Write-Host "MAMA INTERIOR - Database Restore Utility" -ForegroundColor Red
Write-Host "WARNING: This will overwrite existing data!" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Red

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
    Write-Error "DATABASE_URL environment variable is not defined."
    exit 1
}

Write-Host "Restoring from: $BackupFile" -ForegroundColor Cyan

try {
    psql -d "$DbUrl" -f "$BackupFile"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database restored successfully!" -ForegroundColor Green
    } else {
        throw "psql restore failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "Restore failed: $_"
    exit 1
}

