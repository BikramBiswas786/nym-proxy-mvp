# Merge feature branch and trigger deployment
Write-Host "`n🚀 Nym Proxy - Merge & Deploy Automation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  GitHub CLI required. Install via:" -ForegroundColor Red
    Write-Host "winget install GitHub.cli" -ForegroundColor Yellow
    Write-Host "Or see: https://cli.github.com/"
    exit 1
}

# Check if authenticated
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    gh auth login
}

# Detect repo
$remote_url = git config --get remote.origin.url
$repo_parts = $remote_url -replace '\.git$', '' -replace '.*github\.com[:/]', '' -split '/'
$github_owner = $repo_parts[0]
$github_repo = $repo_parts[1]

Write-Host "📋 Repository: $github_owner/$github_repo" -ForegroundColor Cyan
Write-Host ""

# Check for PR
Write-Host "🔍 Checking for pull requests..." -ForegroundColor Yellow
$pr_number = gh pr list -R "$github_owner/$github_repo" --head feature/nym-mixnet-integration --base main --json number -q '.[].number' 2>$null | Select-Object -First 1

if ([string]::IsNullOrEmpty($pr_number)) {
    Write-Host "❌ No pull request found for feature/nym-mixnet-integration" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Creating PR..." -ForegroundColor Yellow
    gh pr create -R "$github_owner/$github_repo" `
        --title "🔒 Implement Real Nym Mixnet Integration" `
        --body "Automated PR merge for Nym mixnet deployment" `
        --head feature/nym-mixnet-integration `
        --base main
    
    $pr_number = gh pr list -R "$github_owner/$github_repo" --head feature/nym-mixnet-integration --base main --json number -q '.[].number' 2>$null | Select-Object -First 1
}

Write-Host "📊 PR #$pr_number found" -ForegroundColor Green
Write-Host ""

# Check PR status
Write-Host "🔍 Checking PR status..." -ForegroundColor Yellow
$pr_status = gh pr view $pr_number -R "$github_owner/$github_repo" --json state -q '.state'

Write-Host "Status: $pr_status" -ForegroundColor Cyan
Write-Host ""

# Check for conflicts
Write-Host "🔍 Checking for merge conflicts..." -ForegroundColor Yellow
$mergeable = gh pr view $pr_number -R "$github_owner/$github_repo" --json mergeable -q '.mergeable'

if ($mergeable -ne "MERGEABLE") {
    Write-Host "❌ PR has conflicts. Please resolve manually." -ForegroundColor Red
    exit 1
}

Write-Host "✅ No conflicts detected" -ForegroundColor Green
Write-Host ""

# Merge PR
Write-Host "🚀 Merging PR #$pr_number..." -ForegroundColor Yellow
gh pr merge $pr_number -R "$github_owner/$github_repo" --squash --auto

Write-Host "✅ PR merged successfully!" -ForegroundColor Green
Write-Host ""

# Wait for workflow
Write-Host "⏳ Waiting for GitHub Actions to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Monitor workflow
Write-Host "📊 Monitoring deployment..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to: https://github.com/$github_owner/$github_repo/actions" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or run: gh run list -R $github_owner/$github_repo --limit 1 --json status,conclusion"
Write-Host ""
Write-Host "The workflow will:" -ForegroundColor Yellow
Write-Host "1. Connect to your VPS via SSH"
Write-Host "2. Download Nym SOCKS5 client"
Write-Host "3. Initialize and start the service"
Write-Host "4. Set up health monitoring"
Write-Host "5. Test SOCKS5 connectivity"
Write-Host ""
Write-Host "⏰ Expected time: 5-10 minutes" -ForegroundColor Yellow
Write-Host ""