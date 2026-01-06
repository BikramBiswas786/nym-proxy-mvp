# Generate SSH key for VPS automation
Write-Host "`n🔐 Generating SSH key for Nym Proxy VPS..." -ForegroundColor Cyan
Write-Host ""

$KeyName = "nym-vps"
$KeyPath = "$env:USERPROFILE\.ssh\$KeyName"

# Check if key already exists
if (Test-Path $KeyPath) {
    Write-Host "⚠️  SSH key already exists at $KeyPath" -ForegroundColor Yellow
    $response = Read-Host "Do you want to regenerate it? (y/n)"
    if ($response -ne "y") {
        Write-Host "Using existing key." -ForegroundColor Green
        Write-Host "📝 Key path: $KeyPath" -ForegroundColor Cyan
        Write-Host "📝 Public key path: $KeyPath.pub" -ForegroundColor Cyan
        exit
    }
    Remove-Item $KeyPath -Force
    Remove-Item "$KeyPath.pub" -Force
}

# Create .ssh directory if it doesn't exist
$SshDir = "$env:USERPROFILE\.ssh"
if (-not (Test-Path $SshDir)) {
    New-Item -ItemType Directory -Path $SshDir | Out-Null
}

# Generate key
$Comment = "nym-proxy-$(Get-Date -Format 'yyyyMMdd')"
Write-Host "Generating ED25519 SSH key..." -ForegroundColor Yellow
ssh-keygen -t ed25519 -f $KeyPath -N "" -C $Comment

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate SSH key. Make sure OpenSSH is installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install OpenSSH on Windows:" -ForegroundColor Yellow
    Write-Host "  Settings > Apps > Optional Features > Add OpenSSH Client"
    exit 1
}

Write-Host ""
Write-Host "✅ SSH key generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Private Key: $KeyPath" -ForegroundColor Cyan
Write-Host "📝 Public Key: $KeyPath.pub" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy your VPS SSH public key to your VPS"
Write-Host "2. Copy the PRIVATE KEY content below to GitHub Secrets as VPS_SSH_KEY:"
Write-Host ""
Write-Host "========== COPY THIS TO GITHUB SECRETS ==========" -ForegroundColor Green
Get-Content $KeyPath
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: You can also upload the public key directly to your VPS:" -ForegroundColor Yellow
Write-Host "  type $KeyPath.pub | ssh root@YOUR_VPS_IP 'cat >> ~/.ssh/authorized_keys'"
Write-Host ""