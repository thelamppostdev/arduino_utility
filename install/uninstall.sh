#!/bin/bash

# Arduino Utility Auto-Start Uninstaller
# This script removes the Arduino daemon auto-start setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLI_NAME="arduino-cli"
LAUNCHAGENT_NAME="com.thelamppostdev.arduino-daemon"
INSTALL_DIR="/usr/local/bin"
LAUNCHAGENT_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/arduino-utility"

echo -e "${BLUE}🗑️  Arduino Utility Auto-Start Uninstaller${NC}"
echo "=========================================="
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Stop and unload LaunchAgent
echo -e "${BLUE}Stopping LaunchAgent...${NC}"
if [ -f "$LAUNCHAGENT_DIR/$LAUNCHAGENT_NAME.plist" ]; then
    launchctl unload "$LAUNCHAGENT_DIR/$LAUNCHAGENT_NAME.plist" 2>/dev/null || true
    print_status "LaunchAgent stopped"
else
    print_warning "LaunchAgent plist not found"
fi

# Remove LaunchAgent plist
if [ -f "$LAUNCHAGENT_DIR/$LAUNCHAGENT_NAME.plist" ]; then
    rm "$LAUNCHAGENT_DIR/$LAUNCHAGENT_NAME.plist"
    print_status "LaunchAgent plist removed"
fi

# Remove CLI binary
echo ""
echo -e "${BLUE}Removing CLI binary...${NC}"
if [ -f "$INSTALL_DIR/$CLI_NAME" ]; then
    sudo rm "$INSTALL_DIR/$CLI_NAME"
    print_status "CLI binary removed"
else
    print_warning "CLI binary not found"
fi

# Clean up daemon socket
echo ""
echo -e "${BLUE}Cleaning up daemon files...${NC}"
if [ -f "/tmp/arduino-daemon.sock" ]; then
    rm -f "/tmp/arduino-daemon.sock"
    print_status "Daemon socket removed"
fi

# Ask about log files
echo ""
echo -e "${YELLOW}Log files are located at: $LOG_DIR${NC}"
read -p "Do you want to remove log files? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "$LOG_DIR" ]; then
        rm -rf "$LOG_DIR"
        print_status "Log files removed"
    fi
else
    print_status "Log files preserved"
fi

echo ""
echo -e "${GREEN}🎉 Uninstallation Complete!${NC}"
echo "============================"
echo ""
echo "The Arduino utility will no longer start automatically."
echo "You can still run it manually from the project directory with:"
echo "  npm run build && node build/cli.js daemon"