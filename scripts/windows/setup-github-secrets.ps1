# Setup GitHub Secrets for Nym Proxy deployment
Write-Host "`n🔐 GitHub Secrets Setup for Nym Proxy" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  GitHub CLI not found. Please install it:" -ForegroundColor Red
    Write-Host "Windows: winget install GitHub.cli" -ForegroundColor Yellow
    Write-Host "Or download: https://cli.github.com/"
    Write-Host ""
    Write-Host "Or manually add secrets via:" -ForegroundColor Yellow
    Write-Host "GitHub → Your Repo → Settings → Secrets and variables → Actions"
    exit 1
}

# Check if authenticated with GitHub
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔐 Authenticating with GitHub..." -ForegroundColor Yellow
    gh auth login
}

Write-Host "📄 Required Information:" -ForegroundColor Yellow
Write-Host ""

# VPS SSH Key
Write-Host "1️⃣  Enter path to your VPS private SSH key (e.g., $env:USERPROFILE\.ssh\nym-vps):"
$vps_ssh_key_path = Read-Host

if (-not (Test-Path $vps_ssh_key_path)) {
    Write-Host "❌ File not found: $vps_ssh_key_path" -ForegroundColor Red
    exit 1
}

$vps_ssh_key = Get-Content $vps_ssh_key_path -Raw

# VPS Host
Write-Host "2️⃣  Enter your VPS IP address (e.g., 123.45.67.89):"
$vps_host = Read-Host

# VPS User
Write-Host "3️⃣  Enter your VPS username (usually 'root' or 'ubuntu'):"
$vps_user = Read-Host
if ([string]::IsNullOrEmpty($vps_user)) {
    $vps_user = "root"
}

# GitHub repository
Write-Host ""
Write-Host "📋 Detecting GitHub repository..." -ForegroundColor Yellow
$remote_url = git config --get remote.origin.url
$repo_parts = $remote_url -replace '\.git$', '' -replace '.*github\.com[:/]', '' -split '/'
$github_owner = $repo_parts[0]
$github_repo = $repo_parts[1]

Write-Host "Repository: $github_owner/$github_repo" -ForegroundColor Cyan
Write-Host ""

# Confirm
Write-Host "🔍 Review your configuration:" -ForegroundColor Yellow
Write-Host "  VPS Host: $vps_host"
Write-Host "  VPS User: $vps_user"
Write-Host "  SSH Key: $($vps_ssh_key.Substring(0, [Math]::Min(50, $vps_ssh_key.Length)))..."
Write-Host "  GitHub: $github_owner/$github_repo"
Write-Host ""
$confirm = Read-Host "Continue? (y/n)"

if ($confirm -ne "y") {
    Write-Host "❌ Cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🚀 Setting GitHub secrets..." -ForegroundColor Yellow

# Set secrets
$vps_ssh_key | gh secret set VPS_SSH_KEY --repo "$github_owner/$github_repo"
gh secret set VPS_HOST --body $vps_host --repo "$github_owner/$github_repo"
gh secret set VPS_USER --body $vps_user --repo "$github_owner/$github_repo"
gh secret set NYM_GATEWAY --body "6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B" --repo "$github_owner/$github_repo"
gh secret set NYM_NETWORK_REQUESTER --body "8rRGWy54oC8drFL9DepMegBt2DLrsqQwCoHMXt9nsnTo.2XjCPVbb4FpQ9hNRcXwb9mTzEAVVk1zf1tcch3wdtNEA@6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B" --repo "$github_owner/$github_repo"

Write-Host "✅ GitHub secrets configured!" -ForegroundColor Green
Write-Host ""
Write-Host "👀 Verify secrets in GitHub:" -ForegroundColor Yellow
Write-Host "https://github.com/$github_owner/$github_repo/settings/secrets/actions"
Write-Host ""