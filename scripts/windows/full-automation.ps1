# Nym Proxy - Full Automation for Windows
# Run with: powershell -ExecutionPolicy Bypass -File scripts/windows/full-automation.ps1

Write-Host "`n🚀 Nym Proxy - FULL AUTOMATION (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "1. Generate SSH key for VPS"
Write-Host "2. Configure GitHub secrets"
Write-Host "3. Merge PR and trigger deployment"
Write-Host "4. Monitor the workflow"
Write-Host ""
Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  - VPS created (DigitalOcean, Hetzner, etc.)"
Write-Host "  - GitHub CLI installed (gh)"
Write-Host "  - Git repository cloned locally"
Write-Host ""

$response = Read-Host "Do you want to continue? (y/n)"
if ($response -ne "y") {
    Write-Host "❌ Cancelled." -ForegroundColor Red
    exit
}

Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Step 1: Generate SSH Key
Write-Host "🔟 Step 1: SSH Key Generation" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""
& "$ScriptDir\generate-ssh-key.ps1"

Write-Host ""
Read-Host "Press Enter when ready to continue"

# Step 2: Setup GitHub Secrets
Write-Host ""
Write-Host "🔟 Step 2: GitHub Secrets Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
& "$ScriptDir\setup-github-secrets.ps1"

Write-Host ""
Read-Host "Press Enter when ready to continue"

# Step 3: Merge and Deploy
Write-Host ""
Write-Host "🔟 Step 3: Merge & Deploy" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
& "$ScriptDir\merge-and-deploy.ps1"

Write-Host ""
Write-Host "🔟 Step 4: Testing" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After workflow completes (5-10 minutes), run:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1"
Write-Host ""
Write-Host "Or set backend URL:"
Write-Host '  $env:BACKEND_URL="https://your-backend.vercel.app"'
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/windows/test-mixnet.ps1"
Write-Host ""
Write-Host "🎉 Automation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next:" -ForegroundColor Yellow
Write-Host "1. Update Apify actor with environment variables"
Write-Host "2. Run integration tests"
Write-Host "3. Update frontend with mixnet status"
Write-Host ""