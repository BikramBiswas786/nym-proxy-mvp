#!/bin/bash

# Setup GitHub Secrets for Nym Proxy deployment
echo "🔐 GitHub Secrets Setup for Nym Proxy"
echo "====================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI not found. Please install it:"
    echo "macOS: brew install gh"
    echo "Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo ""
    echo "Or manually add secrets via:"
    echo "GitHub → Your Repo → Settings → Secrets and variables → Actions"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "🔐 Authenticating with GitHub..."
    gh auth login
fi

echo "📄 Required Information:"
echo ""

# VPS SSH Key
echo "1️⃣  Enter path to your VPS private SSH key (e.g., ~/.ssh/nym-vps):"
read -r vps_ssh_key_path

if [ ! -f "$vps_ssh_key_path" ]; then
    echo "❌ File not found: $vps_ssh_key_path"
    exit 1
fi

vps_ssh_key=$(cat "$vps_ssh_key_path")

# VPS Host
echo "2️⃣  Enter your VPS IP address (e.g., 123.45.67.89):"
read -r vps_host

# VPS User
echo "3️⃣  Enter your VPS username (usually 'root' or 'ubuntu'):"
read -r vps_user
vps_user=${vps_user:-root}

# GitHub repository
echo ""
echo "📋 Detecting GitHub repository..."
GITHUB_REPO=$(git config --get remote.origin.url | sed 's/.git$//' | sed 's/.*github.com.//' | sed 's/\//\n/g')
GITHUB_OWNER=$(echo "$GITHUB_REPO" | head -1)
GITHUB_REPO=$(echo "$GITHUB_REPO" | tail -1)

echo "Repository: $GITHUB_OWNER/$GITHUB_REPO"
echo ""

# Confirm
echo "🔍 Review your configuration:"
echo "  VPS Host: $vps_host"
echo "  VPS User: $vps_user"
echo "  SSH Key: $(echo "${vps_ssh_key:0:50}")..."
echo "  GitHub: $GITHUB_OWNER/$GITHUB_REPO"
echo ""
echo "Continue? (y/n)"
read -r confirm

if [ "$confirm" != "y" ]; then
    echo "❌ Cancelled."
    exit 1
fi

echo ""
echo "🚀 Setting GitHub secrets..."

# Set secrets
gh secret set VPS_SSH_KEY -b"$vps_ssh_key_path" --repo "$GITHUB_OWNER/$GITHUB_REPO"
gh secret set VPS_HOST --body "$vps_host" --repo "$GITHUB_OWNER/$GITHUB_REPO"
gh secret set VPS_USER --body "$vps_user" --repo "$GITHUB_OWNER/$GITHUB_REPO"
gh secret set NYM_GATEWAY --body "6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B" --repo "$GITHUB_OWNER/$GITHUB_REPO"
gh secret set NYM_NETWORK_REQUESTER --body "8rRGWy54oC8drFL9DepMegBt2DLrsqQwCoHMXt9nsnTo.2XjCPVbb4FpQ9hNRcXwb9mTzEAVVk1zf1tcch3wdtNEA@6Gb7ftQdKveMjPyrxDXeAtfYAX7Zg5mVZHtnRC5MmZ1B" --repo "$GITHUB_OWNER/$GITHUB_REPO"

echo "✅ GitHub secrets configured!"
echo ""
echo "💀 Verify secrets in GitHub:"
echo "https://github.com/$GITHUB_OWNER/$GITHUB_REPO/settings/secrets/actions"
echo ""