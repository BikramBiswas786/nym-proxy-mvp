#!/bin/bash
set -e

# Initialize if not already done
if [ ! -d "/root/.nym/service-providers/network-requester/custom-nr" ]; then
    echo "🔧 Initializing Nym Network Requester..."
    ./nym-network-requester init --id custom-nr
    
    # Copy custom whitelist
    if [ -f "/nym/allowed-list.txt" ]; then
        cp /nym/allowed-list.txt /root/.nym/service-providers/network-requester/custom-nr/config/allowed-list.txt
        echo "✅ Custom whitelist configured"
    fi
fi

echo "✅ Starting Nym Network Requester..."
echo "🌐 Custom whitelist active"

# Display Network Requester address
if [ -f "/root/.nym/service-providers/network-requester/custom-nr/data/public_key.pem" ]; then
    echo ""
    echo "📍 Network Requester Address:"
    cat /root/.nym/service-providers/network-requester/custom-nr/data/public_key.pem | head -5
    echo ""
fi

exec "$@"