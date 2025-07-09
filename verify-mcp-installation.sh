#!/bin/bash

echo "🔧 MCP Code Runner Installation Verification"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "1. Checking Claude configuration..."
CONFIG_FILE="/Users/jibbr/Library/Application Support/Claude/claude_desktop_config.json"

if [ -f "$CONFIG_FILE" ]; then
    echo -e "${GREEN}✅ Claude config file found${NC}"
    
    if grep -q "mcp-server-code-runner" "$CONFIG_FILE"; then
        echo -e "${GREEN}✅ MCP Code Runner server configured in Claude${NC}"
    else
        echo -e "${RED}❌ MCP Code Runner server not found in Claude config${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Claude config file not found${NC}"
    exit 1
fi

echo ""
echo "2. Testing MCP Code Runner package availability..."

if npx mcp-server-code-runner@latest --version > /dev/null 2>&1; then
    VERSION=$(npx mcp-server-code-runner@latest --version 2>/dev/null)
    echo -e "${GREEN}✅ MCP Code Runner package available (v${VERSION})${NC}"
else
    echo -e "${RED}❌ MCP Code Runner package not available${NC}"
    exit 1
fi

echo ""
echo "3. Checking supported languages..."
echo -e "${YELLOW}Supported programming languages:${NC}"
echo "   • JavaScript, TypeScript, Python, PHP"
echo "   • Go, Rust, Ruby, Java, C#, Swift"
echo "   • And many more (see GitHub repo for full list)"

echo ""
echo "4. Configuration Summary:"
echo "   • Package: mcp-server-code-runner@latest"
echo "   • Transport: stdio (default)"
echo "   • Command: npx -y mcp-server-code-runner@latest"

echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo ""
echo "To use the Code Runner in Claude:"
echo "   1. Restart Claude Desktop application"
echo "   2. Try prompts like:"
echo "      • 'Run this JavaScript code: console.log(5+6)'"
echo "      • 'Execute this Python: print(\"Hello World\")'"
echo "      • 'Use run-code tool to check my CPU count'"
echo ""
echo -e "${YELLOW}Note: Restart Claude Desktop to activate the new MCP server${NC}"
