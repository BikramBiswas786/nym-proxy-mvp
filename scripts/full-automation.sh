#!/bin/bash

# Full automation: SSH key → GitHub secrets → Merge & Deploy
echo "🚀 Nym Proxy - FULL AUTOMATION"
echo "============================"
echo ""
echo "This script will:"
echo "1. Generate SSH key for VPS"
echo "2. Configure GitHub secrets"
echo "3. Merge PR and trigger deployment"
echo "4. Monitor the workflow"
echo ""
echo "Prerequisites:"
echo "  - VPS created (DigitalOcean, Hetzner, etc.)"
echo "  - GitHub CLI installed (gh)"
echo "  - Git repository cloned locally"
echo ""
echo "Do you want to continue? (y/n)"
read -r response

if [ "$response" != "y" ]; then
    echo "❌ Cancelled."
    exit 0
fi

echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Step 1: Generate SSH Key
echo "🔟 Step 1: SSH Key Generation"
echo "============================="necho ""
bash "$SCRIPT_DIR/generate-ssh-key.sh"

echo ""
echo "Press Enter when ready to continue..."
read -r

# Step 2: Setup GitHub Secrets
echo ""
echo "🔟 Step 2: GitHub Secrets Setup"
echo "==============================="
echo ""
bash "$SCRIPT_DIR/setup-github-secrets.sh"

echo ""
echo "Press Enter when ready to continue..."
read -r

# Step 3: Merge and Deploy
echo ""
echo "🔟 Step 3: Merge & Deploy"
echo "========================="
echo ""
bash "$SCRIPT_DIR/merge-and-deploy.sh"

echo ""
echo "🔟 Step 4: Testing"
echo "=================="
echo ""
echo "After workflow completes (5-10 minutes), run:"
echo "  bash $SCRIPT_DIR/test-mixnet.sh"
echo ""
echo "Or set backend URL:"
echo "  BACKEND_URL=https://your-backend.vercel.app bash $SCRIPT_DIR/test-mixnet.sh"
echo ""
echo "🎉 Automation Complete!"
echo ""
echo "💡 Next:"
echo "1. Update Apify actor with environment variables"
echo "2. Run integration tests"
echo "3. Update frontend with mixnet status"
echo ""