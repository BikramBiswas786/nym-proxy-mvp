#!/bin/bash

# One-command VPS setup for Nym SOCKS5 client
# Usage: bash setup-vps.sh

set -e

echo "🚀 Nym Proxy VPS Setup"
echo "======================"
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  This script should NOT be run as root"
   echo "Please run as regular user with sudo privileges"
   exit 1
fi

# Variables
NYM_VERSION="v2024.12-chomp"
DEPLOY_DIR="$HOME/nym-proxy-deployment"
NYM_NETWORK_REQUESTER="8rRGWy54oC8drFL9DepMegBt2DLrsqQwCoHMXt9nsnTo.2XjCPVbb4FpQ9hNRcXwb9mTzEAVVk1zf1tcch3wdtNEA@6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B"

echo "📦 Step 1: Updating system packages..."
sudo apt-get update -qq
sudo apt-get install -y wget curl

echo "🐳 Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

echo "📁 Step 3: Creating deployment directory..."
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo "⬇️  Step 4: Downloading Nym SOCKS5 client..."
wget -q --show-progress https://github.com/nymtech/nym/releases/download/$NYM_VERSION/nym-socks5-client || \
    wget -q --show-progress https://github.com/nymtech/nym/releases/latest/download/nym-socks5-client
chmod +x nym-socks5-client

echo "🔧 Step 5: Initializing SOCKS5 client..."
./nym-socks5-client init --id nym-proxy-client --provider $NYM_NETWORK_REQUESTER

echo "📝 Step 6: Creating systemd service..."
sudo tee /etc/systemd/system/nym-socks5.service > /dev/null <<EOF
[Unit]
Description=Nym SOCKS5 Client for Proxy
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOY_DIR
ExecStart=$DEPLOY_DIR/nym-socks5-client run --id nym-proxy-client
Restart=on-failure
RestartSec=30
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

echo "🚀 Step 7: Starting SOCKS5 service..."
sudo systemctl daemon-reload
sudo systemctl enable nym-socks5
sudo systemctl start nym-socks5

echo "⏳ Waiting for service to start..."
sleep 15

echo "📊 Service status:"
sudo systemctl status nym-socks5 --no-pager || true

echo ""
echo "✅ ===== Setup Complete ====="
echo ""
echo "📍 SOCKS5 Proxy: localhost:1080"
echo "🔧 Service: sudo systemctl status nym-socks5"
echo "📝 Logs: sudo journalctl -u nym-socks5 -f"
echo ""
echo "🧪 Test connectivity:"
echo "curl --socks5 localhost:1080 https://nymtech.net/favicon.svg"
echo ""
echo "⚠️  Note: It may take 2-3 minutes for the mixnet client to establish connections"
echo ""