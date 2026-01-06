#!/bin/bash
set -e

# Initialize if not already done
if [ ! -d "/root/.nym/socks5-clients/docker-client" ]; then
    echo "🔧 Initializing Nym SOCKS5 client..."
    ./nym-socks5-client init --id docker-client \
        --provider ${NYM_NETWORK_REQUESTER:-8rRGWy54oC8drFL9DepMegBt2DLrsqQwCoHMXt9nsnTo.2XjCPVbb4FpQ9hNRcXwb9mTzEAVVk1zf1tcch3wdtNEA@6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B}
fi

echo "✅ Starting Nym SOCKS5 client..."
echo "📍 Proxy listening on 0.0.0.0:1080"
echo "🔒 Routing through Nym mixnet..."

exec "$@"