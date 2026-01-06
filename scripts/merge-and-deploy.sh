#!/bin/bash

# Merge feature branch and trigger deployment
echo "🚀 Nym Proxy - Merge & Deploy Automation"
echo "======================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI required. Install via:"
    echo "brew install gh (macOS) or see https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    gh auth login
fi

# Detect repo
GITHUB_REPO=$(git config --get remote.origin.url | sed 's/.git$//' | sed 's/.*github.com.//' | sed 's/\//\n/g')
GITHUB_OWNER=$(echo "$GITHUB_REPO" | head -1)
GITHUB_REPO=$(echo "$GITHUB_REPO" | tail -1)

echo "📋 Repository: $GITHUB_OWNER/$GITHUB_REPO"
echo ""

# Check for PR
echo "🔍 Checking for pull requests..."
PR_NUMBER=$(gh pr list -R "$GITHUB_OWNER/$GITHUB_REPO" --head feature/nym-mixnet-integration --base main --json number -q '.[] | .number' | head -1)

if [ -z "$PR_NUMBER" ]; then
    echo "❌ No pull request found for feature/nym-mixnet-integration"
    echo ""
    echo "💡 Creating PR..."
    gh pr create -R "$GITHUB_OWNER/$GITHUB_REPO" \
        --title "🔒 Implement Real Nym Mixnet Integration" \
        --body "Automated PR merge for Nym mixnet deployment" \
        --head feature/nym-mixnet-integration \
        --base main
    
    PR_NUMBER=$(gh pr list -R "$GITHUB_OWNER/$GITHUB_REPO" --head feature/nym-mixnet-integration --base main --json number -q '.[] | .number' | head -1)
fi

echo "📊 PR #$PR_NUMBER found"
echo ""

# Check PR status
echo "🔍 Checking PR status..."
PR_STATUS=$(gh pr view $PR_NUMBER -R "$GITHUB_OWNER/$GITHUB_REPO" --json state -q '.state')

echo "Status: $PR_STATUS"
echo ""

# Check for conflicts
echo "🔍 Checking for merge conflicts..."
MERGEABLE=$(gh pr view $PR_NUMBER -R "$GITHUB_OWNER/$GITHUB_REPO" --json mergeable -q '.mergeable')

if [ "$MERGEABLE" != "MERGEABLE" ]; then
    echo "❌ PR has conflicts. Please resolve manually."
    exit 1
fi

echo "✅ No conflicts detected"
echo ""

# Merge PR
echo "🚀 Merging PR #$PR_NUMBER..."
gh pr merge $PR_NUMBER -R "$GITHUB_OWNER/$GITHUB_REPO" --squash --auto

echo "✅ PR merged successfully!"
echo ""

# Wait for workflow
echo "⏳ Waiting for GitHub Actions to start..."
sleep 5

# Monitor workflow
echo "📊 Monitoring deployment..."
echo ""
echo "Go to: https://github.com/$GITHUB_OWNER/$GITHUB_REPO/actions"
echo ""
echo "Or run: gh run list -R $GITHUB_OWNER/$GITHUB_REPO --limit 1 --json status,conclusion"
echo ""
echo "The workflow will:"
echo "1. Connect to your VPS via SSH"
echo "2. Download Nym SOCKS5 client"
echo "3. Initialize and start the service"
echo "4. Set up health monitoring"
echo "5. Test SOCKS5 connectivity"
echo ""
echo "⏰ Expected time: 5-10 minutes"
echo ""