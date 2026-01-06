#!/bin/bash

# Health check for Nym SOCKS5 client
LOG_FILE="$HOME/nym-proxy-deployment/health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Running health check..." >> "$LOG_FILE"

# Check if SOCKS5 service is running
if systemctl is-active --quiet nym-socks5; then
    echo "[$TIMESTAMP] ✅ SOCKS5 service is running" >> "$LOG_FILE"
    
    # Test connectivity through SOCKS5
    if timeout 30s curl --socks5 localhost:1080 -s https://nymtech.net/favicon.svg > /dev/null 2>&1; then
        echo "[$TIMESTAMP] ✅ SOCKS5 connectivity test passed" >> "$LOG_FILE"
    else
        echo "[$TIMESTAMP] ❌ SOCKS5 connectivity test failed" >> "$LOG_FILE"
        
        # Restart service
        echo "[$TIMESTAMP] 🔄 Restarting SOCKS5 service..." >> "$LOG_FILE"
        sudo systemctl restart nym-socks5
        sleep 15
    fi
else
    echo "[$TIMESTAMP] ❌ SOCKS5 service is not running" >> "$LOG_FILE"
    echo "[$TIMESTAMP] 🔄 Starting SOCKS5 service..." >> "$LOG_FILE"
    sudo systemctl start nym-socks5
    sleep 15
fi

# Check Network Requester if it exists
if systemctl list-unit-files | grep -q nym-network-requester; then
    if systemctl is-active --quiet nym-network-requester; then
        echo "[$TIMESTAMP] ✅ Network Requester is running" >> "$LOG_FILE"
    else
        echo "[$TIMESTAMP] ❌ Network Requester is not running" >> "$LOG_FILE"
        sudo systemctl restart nym-network-requester
    fi
fi

# Keep only last 1000 lines of log
tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
