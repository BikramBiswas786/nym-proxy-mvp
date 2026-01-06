#!/bin/bash

# Generate SSH key for VPS automation
echo "🔐 Generating SSH key for Nym Proxy VPS..."
echo ""

KEY_NAME="nym-vps"
KEY_PATH="$HOME/.ssh/$KEY_NAME"

# Check if key already exists
if [ -f "$KEY_PATH" ]; then
    echo "⚠️  SSH key already exists at $KEY_PATH"
    echo "Do you want to regenerate it? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        echo "Using existing key."
        echo "📝 Key path: $KEY_PATH"
        echo "📝 Public key path: $KEY_PATH.pub"
        exit 0
    fi
    rm "$KEY_PATH" "$KEY_PATH.pub"
fi

# Create .ssh directory if it doesn't exist
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# Generate key
ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "nym-proxy-$(date +%Y%m%d)"

echo ""
echo "✅ SSH key generated successfully!"
echo ""
echo "📝 Private Key: $KEY_PATH"
echo "📝 Public Key: $KEY_PATH.pub"
echo ""
echo "📄 Next Steps:"
echo "1. Copy your VPS SSH public key to your VPS"
echo "2. Copy the PRIVATE KEY content below to GitHub Secrets as VPS_SSH_KEY:"
echo ""
echo "========== COPY THIS TO GITHUB SECRETS =========="
cat "$KEY_PATH"
echo "==============================================="
echo ""
echo "💡 Tip: You can also upload the public key directly to your VPS:"
echo "ssh-copy-id -i $KEY_PATH.pub root@YOUR_VPS_IP"
echo ""