#!/bin/bash

# Test Nym mixnet integration
echo "🧪 Testing Nym Mixnet Integration"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📄 Configuration:"
echo "Backend: ${BACKEND_URL:-https://nym-proxy-backend.vercel.app}"
echo ""

BACKEND_URL=${BACKEND_URL:-https://nym-proxy-backend.vercel.app}

# Test 1: Status endpoint
echo "🔍 Test 1: Check mixnet status..."
echo ""
echo "Request: GET /v1/status"
echo ""

STATUS_RESPONSE=$(curl -s "$BACKEND_URL/v1/status")
echo "Response:"
echo "$STATUS_RESPONSE" | jq .

MIXNET_ENABLED=$(echo "$STATUS_RESPONSE" | jq -r '.mixnetEnabled')
if [ "$MIXNET_ENABLED" = "true" ]; then
    echo -e "${GREEN}✅ Mixnet is ENABLED${NC}"
else
    echo -e "${YELLOW}⚠️  Mixnet is DISABLED (may still be initializing)${NC}"
fi

echo ""

# Test 2: Standard proxy request
echo "🔍 Test 2: Standard proxy request (no mixnet)..."
echo ""
echo "Request: POST /v1/proxy"
echo 'Body: {"url": "https://httpbin.org/ip", "useMixnet": false}'
echo ""

echo "Sending request... (this may take 5-10 seconds)"
STANDARD_RESPONSE=$(curl -s -X POST "$BACKEND_URL/v1/proxy" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/ip", "useMixnet": false}')

echo "Response:"
echo "$STANDARD_RESPONSE" | jq .

STANDARD_TOKEN=$(echo "$STANDARD_RESPONSE" | jq -r '.token')
STANDARD_DURATION=$(echo "$STANDARD_RESPONSE" | jq -r '.duration')
STANDARD_PRIVACY=$(echo "$STANDARD_RESPONSE" | jq -r '.privacyLevel')

if [ "$STANDARD_TOKEN" != "null" ] && [ ! -z "$STANDARD_TOKEN" ]; then
    echo -e "${GREEN}✅ Standard proxy request successful${NC}"
    echo "  Token: $STANDARD_TOKEN"
    echo "  Duration: ${STANDARD_DURATION}ms"
    echo "  Privacy Level: $STANDARD_PRIVACY"
else
    echo -e "${RED}❌ Standard proxy request failed${NC}"
fi

echo ""

# Test 3: Mixnet proxy request
echo "🔍 Test 3: Mixnet proxy request (with SOCKS5)..."
echo ""
echo "Request: POST /v1/proxy"
echo 'Body: {"url": "https://httpbin.org/ip", "useMixnet": true}'
echo ""

echo "Sending request through Nym mixnet... (this will take 8-15 seconds)"
MIXNET_RESPONSE=$(curl -s -X POST "$BACKEND_URL/v1/proxy" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/ip", "useMixnet": true}' \
  --max-time 30)

echo "Response:"
echo "$MIXNET_RESPONSE" | jq .

MIXNET_TOKEN=$(echo "$MIXNET_RESPONSE" | jq -r '.token')
MIXNET_DURATION=$(echo "$MIXNET_RESPONSE" | jq -r '.duration')
MIXNET_PRIVACY=$(echo "$MIXNET_RESPONSE" | jq -r '.privacyLevel')
VIA_MIXNET=$(echo "$MIXNET_RESPONSE" | jq -r '.viaMixnet')

if [ "$MIXNET_TOKEN" != "null" ] && [ ! -z "$MIXNET_TOKEN" ]; then
    echo -e "${GREEN}✅ Mixnet proxy request successful${NC}"
    echo "  Token: $MIXNET_TOKEN"
    echo "  Duration: ${MIXNET_DURATION}ms"
    echo "  Privacy Level: $MIXNET_PRIVACY"
    echo "  Via Mixnet: $VIA_MIXNET"
    
    if [ "$MIXNET_DURATION" -gt 8000 ]; then
        echo -e "${GREEN}✅ Latency is acceptable (>8s indicates mixnet routing)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Mixnet request failed (may still be initializing)${NC}"
    echo "Error: $MIXNET_RESPONSE"
fi

echo ""

# Test 4: Retrieve results
if [ ! -z "$STANDARD_TOKEN" ] && [ "$STANDARD_TOKEN" != "null" ]; then
    echo "🔍 Test 4: Retrieve standard proxy result..."
    echo ""
    echo "Request: GET /v1/proxy/$STANDARD_TOKEN"
    echo ""
    
    RESULT_RESPONSE=$(curl -s "$BACKEND_URL/v1/proxy/$STANDARD_TOKEN")
    RESULT_SIZE=$(echo "$RESULT_RESPONSE" | wc -c)
    
    if echo "$RESULT_RESPONSE" | grep -q "<html\|{\|\["; then
        echo -e "${GREEN}✅ Retrieved proxied content successfully${NC}"
        echo "  Response size: $RESULT_SIZE bytes"
    else
        echo -e "${RED}❌ Failed to retrieve content${NC}"
    fi
    echo ""
fi

# Summary
echo "📈 Test Summary:"
echo ""
echo "Status Check: $([[ "$MIXNET_ENABLED" == "true" ]] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  WARNING${NC}")"
echo "Standard Proxy: $([[ ! -z "$STANDARD_TOKEN" ]] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo "Mixnet Proxy: $([[ ! -z "$MIXNET_TOKEN" ]] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  FAIL/INITIALIZING${NC}")"
echo ""

echo "💡 Next Steps:"
echo "1. If Mixnet Proxy shows FAIL, wait 2-3 minutes and retry"
echo "2. Check VPS logs: ssh YOUR_VPS 'sudo journalctl -u nym-socks5 -f'"
echo "3. Verify SOCKS5: ssh YOUR_VPS 'curl --socks5 localhost:1080 https://nymtech.net/favicon.svg'"
echo ""