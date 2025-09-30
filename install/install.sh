#!/bin/bash

# Arduino Utility Auto-Start Installation Script
# This script installs the Arduino daemon to run automatically at login

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_NAME="arduino-cli"
LAUNCHAGENT_NAME="com.thelamppostdev.arduino-daemon"
INSTALL_DIR="/usr/local/bin"
LAUNCHAGENT_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/arduino-utility"

echo -e "${BLUE}🔧 Arduino Utility Auto-Start Installer${NC}"
echo "======================================"
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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi
print_status "Node.js found: $(node --version)"

# Check if we're in the right directory
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    print_error "package.json not found. Please run this script from the project directory."
    exit 1
fi

# Stop existing daemon if running
echo ""
echo -e "${BLUE}Stopping existing daemon...${NC}"
if [ -f "/tmp/arduino-daemon.sock" ]; then
    print_warning "Daemon is running, attempting to stop..."
    # Try to stop gracefully via launchctl first
    launchctl unload "$LAUNCHAGENT_DIR/$LAUNCHAGENT_NAME.plist" 2>/dev/null || true
    sleep 2
    # Remove socket file if it still exists
    rm -f "/tmp/arduino-daemon.sock" 2>/dev/null || true
    print_status "Daemon stopped"
else
    print_status "No daemon running"
fi

# Build the project
echo ""
echo -e "${BLUE}Building project...${NC}"
cd "$PROJECT_DIR"
npm run build
print_status "Project built successfully"

# Create log directory
echo ""
echo -e "${BLUE}Setting up directories...${NC}"
mkdir -p "$LOG_DIR"
print_status "Log directory created: $LOG_DIR"

# Install CLI binary
echo ""
echo -e "${BLUE}Installing CLI binary...${NC}"
CLI_SCRIPT="$INSTALL_DIR/$CLI_NAME"

# Create wrapper script
sudo tee "$CLI_SCRIPT" > /dev/null << 'EOF'
#!/bin/bash
exec node "PROJECT_DIR_PLACEHOLDER/build/cli.js" "$@"
EOF

# Replace the placeholder with actual project directory
sudo sed -i "" "s|PROJECT_DIR_PLACEHOLDER|$PROJECT_DIR|g" "$CLI_SCRIPT"

sudo chmod +x "$CLI_SCRIPT"
print_status "CLI installed: $CLI_SCRIPT"

# Test CLI installation
if ! "$CLI_SCRIPT" --help &> /dev/null; then
    print_error "CLI installation failed - binary not working"
    exit 1
fi
print_status "CLI installation verified"

# Create LaunchAgent directory
mkdir -p "$LAUNCHAGENT_DIR"

# Update LaunchAgent plist with correct username
PLIST_FILE="$PROJECT_DIR/install/$LAUNCHAGENT_NAME.plist"
TEMP_PLIST="/tmp/$LAUNCHAGENT_NAME.plist"

# Replace username and paths in plist
sed "s/<string>bm0918<\/string>/<string>$(whoami)<\/string>/g" "$PLIST_FILE" > "$TEMP_PLIST"
sed -i "" "s|/Users/bm0918|$HOME|g" "$TEMP_PLIST"

# Install LaunchAgent
echo ""
echo -e "${BLUE}Installing LaunchAgent...${NC}"
cp "$TEMP_PLIST" "$LAUNCHAGENT_DIR/$LAUNCHAGENT_NAME.plist"
rm "$TEMP_PLIST"
print_status "LaunchAgent plist installed"

# Load LaunchAgent
echo ""
echo -e "${BLUE}Loading LaunchAgent...${NC}"
launchctl load "$LAUNCHAGENT_DIR/$LAUNCHAGENT_NAME.plist"
print_status "LaunchAgent loaded and started"

# Wait a moment for daemon to start
echo ""
echo -e "${BLUE}Waiting for daemon to start...${NC}"
sleep 3

# Test daemon
echo ""
echo -e "${BLUE}Testing daemon...${NC}"
if "$CLI_SCRIPT" status &> /dev/null; then
    print_status "Daemon is running and responding"
    
    # Show status
    echo ""
    echo -e "${BLUE}Daemon Status:${NC}"
    "$CLI_SCRIPT" status
else
    print_warning "Daemon may not be fully ready yet. Check logs:"
    echo "  Stdout: $LOG_DIR/daemon-stdout.log"
    echo "  Stderr: $LOG_DIR/daemon-stderr.log"
    echo "  Application: $LOG_DIR/arduino-daemon.log"
fi

echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo "================================"
echo ""
echo "Your Arduino utility will now start automatically when you log in."
echo ""
echo -e "${BLUE}Available commands:${NC}"
echo "  $CLI_SCRIPT status          # Check daemon status"
echo "  $CLI_SCRIPT send 'onair-red'   # Send Arduino command"
echo "  $CLI_SCRIPT term            # Interactive terminal"
echo ""
echo -e "${BLUE}Management commands:${NC}"
echo "  launchctl unload ~/Library/LaunchAgents/$LAUNCHAGENT_NAME.plist  # Stop auto-start"
echo "  launchctl load ~/Library/LaunchAgents/$LAUNCHAGENT_NAME.plist    # Enable auto-start"
echo ""
echo -e "${BLUE}Log files:${NC}"
echo "  $LOG_DIR/"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure your Arduino is connected for the daemon to work properly."