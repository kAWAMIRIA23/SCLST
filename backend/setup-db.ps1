<#
.SYNOPSIS
    Bootstraps the SLCTS PostgreSQL database and backend runtime configuration.

.DESCRIPTION
    One-shot local provisioning script for the SLCTS (Smart Logistics & Cargo Transit System)
  backend. It authenticates against PostgreSQL, ensures the target database exists, applies
  the canonical schema from sql/schema.sql, and writes backend/.env with DATABASE_URL and PORT.

    Architectural role: infrastructure layer — runs outside the Node.js application and is
  invoked manually before `npm run dev`. Depends on psql CLI and sql/schema.sql. Does not
  seed application data (use `npm run seed:admin` for the admin user).

.PARAMETER PostgresUser
    PostgreSQL superuser or role with CREATE DATABASE privilege. Default: postgres.

.PARAMETER DatabaseName
    Name of the SLCTS application database. Default: slcts.

.PARAMETER DbHost
    PostgreSQL host. Default: localhost.

.PARAMETER Port
    PostgreSQL port. Default: 5432.

.EXAMPLE
    cd backend; .\setup-db.ps1
#>

param(
  [string]$PostgresUser = "postgres",
  [string]$DatabaseName = "slcts",
  [string]$DbHost = "localhost",
  [int]$Port = 5432
)

$ErrorActionPreference = "Stop"

# Prompt once for PGPASSWORD if not already set — psql reads this env var for non-interactive auth
if (-not $env:PGPASSWORD) {
  $secure = Read-Host "Enter password for PostgreSQL user '$PostgresUser'" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}

Write-Host "Checking if database '$DatabaseName' exists..."
$exists = psql -U $PostgresUser -h $DbHost -p $Port -tAc "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"

if ($exists -ne "1") {
  Write-Host "Creating database '$DatabaseName'..."
  psql -U $PostgresUser -h $DbHost -p $Port -c "CREATE DATABASE $DatabaseName;"
} else {
  Write-Host "Database '$DatabaseName' already exists."
}

# Build connection string consumed by config/database.ts via dotenv
$databaseUrl = "postgresql://${PostgresUser}:$($env:PGPASSWORD)@${DbHost}:${Port}/${DatabaseName}"
$env:DATABASE_URL = $databaseUrl

Write-Host "Applying schema..."
psql $env:DATABASE_URL -f "$PSScriptRoot\sql\schema.sql"

# Minimal .env — JWT_SECRET and other vars must be added manually or copied from .env.example
$envFile = Join-Path $PSScriptRoot ".env"
@"
DATABASE_URL=$databaseUrl
PORT=3001
"@ | Set-Content -Path $envFile -Encoding utf8

Write-Host ""
Write-Host "Done. Created backend/.env and applied schema to database '$DatabaseName'."
Write-Host "Start the API with: npm run dev"
