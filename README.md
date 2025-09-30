# Arduino Utility

A TypeScript CLI utility for controlling Arduino-based LED status indicators with automatic on-air detection. This project provides a daemon/client architecture for reliable Arduino communication and automatic startup at login.

## Features

🔴 **Automatic On-Air Detection** - Monitors system for video calls and automatically controls status LED  
🎨 **LED Ring Control** - Send commands to control a 12-pixel NeoPixel ring with various colors and animations  
🔄 **Robust Reconnection** - Automatically handles Arduino USB disconnect/reconnect with exponential backoff  
🚀 **Auto-Start at Login** - macOS LaunchAgent ensures the daemon starts automatically  
📡 **Client/Server Architecture** - Daemon manages Arduino, multiple clients can send commands  
📋 **Comprehensive Logging** - File-based logging for monitoring and troubleshooting  

## Hardware Setup

- **Arduino Uno** with custom firmware (see `/arduino` directory)
- **13 NeoPixels**: 12-pixel ring + 1 status LED
- **USB connection** for serial communication

## Quick Start

### Installation

1. **Clone and build the project:**
   ```bash
   git clone https://github.com/thelamppostdev/arduino_utility.git
   cd arduino_utility
   npm install
   npm run build
   ```

2. **Install for auto-startup:**
   ```bash
   ./install/install.sh
   ```

   This will:
   - Install the CLI to `/usr/local/bin/arduino-cli`
   - Set up macOS LaunchAgent for auto-start at login
   - Create log directories
   - Start the daemon immediately

### Manual Usage (Without Auto-Start)

```bash
# Start daemon manually
npm run build
node build/cli.js daemon

# In another terminal, send commands
node build/cli.js send "onair-red"      # Set status LED to red (on-call)
node build/cli.js send "onair-blue"     # Set status LED to blue (available)
node build/cli.js send "ring-purple-pulse"  # Set ring to purple with pulse animation
```

## Commands

### Daemon Management
```bash
arduino-cli daemon               # Start the daemon (auto-started by LaunchAgent)
arduino-cli status               # Check daemon and Arduino status
```

### LED Control
```bash
# Status LED (on-air indicator)
arduino-cli send "onair-red"     # On-call (red)
arduino-cli send "onair-blue"    # Available (blue)

# LED Ring (status display)
arduino-cli send "ring-green-fire"      # Green with fire animation
arduino-cli send "ring-purple-pulse"    # Purple with pulse animation
arduino-cli send "ring-yellow-progress" # Yellow with progress animation
```

### Interactive Terminal
```bash
arduino-cli term                 # Interactive command terminal
```

## Arduino Protocol

Commands are sent as text strings ending with semicolon:
```
onair-red;                      # Set status LED red
onair-blue;                     # Set status LED blue
ring-color-animation;           # Set ring color and animation
```

**Available Colors:** red, orange, yellow, lime, green, teal, marine, blue, purple, magenta, pink, white

**Available Animations:** fire, pulse, progress

## Auto-Start Management

The daemon automatically starts at login via macOS LaunchAgent. To manage:

```bash
# Disable auto-start
launchctl unload ~/Library/LaunchAgents/com.thelamppostdev.arduino-daemon.plist

# Enable auto-start
launchctl load ~/Library/LaunchAgents/com.thelamppostdev.arduino-daemon.plist

# Uninstall completely
./install/uninstall.sh
```

## Logging

Logs are stored in `~/Library/Logs/arduino-utility/`:
- `arduino-daemon.log` - Application logs
- `daemon-stdout.log` - Daemon stdout
- `daemon-stderr.log` - Daemon stderr

## On-Air Detection

The daemon automatically monitors your system for video call applications and camera usage:
- **Red LED**: Detects active video calls (Zoom, Teams, Meet, etc.)
- **Blue LED**: No calls detected (available)
- **Check interval**: Every 5 seconds

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│   LaunchAgent   │───▶│     Daemon       │◄──▶│   Arduino   │
│  (Auto-start)   │    │ (Arduino Mgmt)   │    │  (LED Ring) │
└─────────────────┘    └──────────────────┘    └─────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    Unix Socket        │
                    │ /tmp/arduino-daemon.sock
                    └───────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │    CLI      │ │   Status    │ │   Future    │
        │   Client    │ │   Client    │ │  Clients    │
        └─────────────┘ └─────────────┘ └─────────────┘
```

## Development

### Building
```bash
npm run build                    # Build TypeScript
```

### Testing
```bash
# Start daemon in debug mode
node build/cli.js daemon --debug

# Test commands
node build/cli.js send "ring-red-fire"
node build/cli.js status
```

## Legacy CLI (Deprecated)

The original text/hex input mode is available but deprecated:
- Use `--manual` for manual port selection
- Use `--text` for text input mode
- Use `--debug` for verbose output

## Troubleshooting

1. **Daemon won't start**: Check logs in `~/Library/Logs/arduino-utility/`
2. **Arduino not found**: Ensure Arduino is connected and running the correct firmware
3. **Permission issues**: Re-run installation script with proper permissions
4. **Socket errors**: Remove `/tmp/arduino-daemon.sock` and restart daemon

## Repository

Originally at `bentonmize/arduino_utility`, now maintained at `thelamppostdev/arduino_utility`.
