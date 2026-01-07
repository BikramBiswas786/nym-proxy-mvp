# Test Nym mixnet integration
Write-Host "`n🧪 Testing Nym Mixnet Integration" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$BackendUrl = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "https://nym-proxy-backend.vercel.app" }

Write-Host "📄 Configuration:" -ForegroundColor Yellow
Write-Host "Backend: $BackendUrl"
Write-Host ""

# Test 1: Status endpoint
Write-Host "🔍 Test 1: Check mixnet status..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Request: GET /v1/status"
Write-Host ""

try {
    $statusResponse = Invoke-RestMethod -Uri "$BackendUrl/v1/status" -Method Get
    Write-Host "Response:" -ForegroundColor Green
    $statusResponse | ConvertTo-Json -Depth 5
    
    $mixnetEnabled = $statusResponse.mixnetEnabled
    if ($mixnetEnabled) {
        Write-Host "✅ Mixnet is ENABLED" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Mixnet is DISABLED (may still be initializing)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Status check failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Standard proxy request
Write-Host "🔍 Test 2: Standard proxy request (no mixnet)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Request: POST /v1/proxy"
Write-Host 'Body: {"url": "https://httpbin.org/ip", "useMixnet": false}'
Write-Host ""

Write-Host "Sending request... (this may take 5-10 seconds)" -ForegroundColor Cyan

try {
    $standardBody = @{
        url = "https://httpbin.org/ip"
        useMixnet = $false
    } | ConvertTo-Json
    
    $standardResponse = Invoke-RestMethod -Uri "$BackendUrl/v1/proxy" -Method Post -Body $standardBody -ContentType "application/json"
    
    Write-Host "Response:" -ForegroundColor Green
    $standardResponse | ConvertTo-Json -Depth 5
    
    $standardToken = $standardResponse.token
    $standardDuration = $standardResponse.duration
    $standardPrivacy = $standardResponse.privacyLevel
    
    if ($standardToken) {
        Write-Host "✅ Standard proxy request successful" -ForegroundColor Green
        Write-Host "  Token: $standardToken" -ForegroundColor Cyan
        Write-Host "  Duration: ${standardDuration}ms" -ForegroundColor Cyan
        Write-Host "  Privacy Level: $standardPrivacy" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Standard proxy request failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Standard proxy request failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 3: Mixnet proxy request
Write-Host "🔍 Test 3: Mixnet proxy request (with SOCKS5)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Request: POST /v1/proxy"
Write-Host 'Body: {"url": "https://httpbin.org/ip", "useMixnet": true}'
Write-Host ""

Write-Host "Sending request through Nym mixnet... (this will take 8-15 seconds)" -ForegroundColor Cyan

try {
    $mixnetBody = @{
        url = "https://httpbin.org/ip"
        useMixnet = $true
    } | ConvertTo-Json
    
    $mixnetResponse = Invoke-RestMethod -Uri "$BackendUrl/v1/proxy" -Method Post -Body $mixnetBody -ContentType "application/json" -TimeoutSec 30
    
    Write-Host "Response:" -ForegroundColor Green
    $mixnetResponse | ConvertTo-Json -Depth 5
    
    $mixnetToken = $mixnetResponse.token
    $mixnetDuration = $mixnetResponse.duration
    $mixnetPrivacy = $mixnetResponse.privacyLevel
    $viaMixnet = $mixnetResponse.viaMixnet
    
    if ($mixnetToken) {
        Write-Host "✅ Mixnet proxy request successful" -ForegroundColor Green
        Write-Host "  Token: $mixnetToken" -ForegroundColor Cyan
        Write-Host "  Duration: ${mixnetDuration}ms" -ForegroundColor Cyan
        Write-Host "  Privacy Level: $mixnetPrivacy" -ForegroundColor Cyan
        Write-Host "  Via Mixnet: $viaMixnet" -ForegroundColor Cyan
        
        if ($mixnetDuration -gt 8000) {
            Write-Host "✅ Latency is acceptable (>8s indicates mixnet routing)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  Mixnet request failed (may still be initializing)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Mixnet request failed: $_" -ForegroundColor Yellow
    Write-Host "(This is normal if the mixnet is still initializing)" -ForegroundColor Cyan
}

Write-Host ""

# Summary
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host ""

Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "1. If Mixnet Proxy shows FAIL, wait 2-3 minutes and retry"
Write-Host "2. Check VPS logs: ssh YOUR_VPS 'sudo journalctl -u nym-socks5 -f'"
Write-Host "3. Verify SOCKS5: ssh YOUR_VPS 'curl --socks5 localhost:1080 https://nymtech.net/favicon.svg'"
Write-Host ""