#!/bin/bash

# 🔍 PelicanOS Service Status Checker
# Quick verification of current setup

echo "🕊️  PelicanOS Service Status Check"
echo "================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

check_service() {
    local service_name=$1
    local url=$2
    local expected_response=$3
    
    echo -n "Checking $service_name: "
    if response=$(curl -s "$url" 2>/dev/null); then
        if [[ -z "$expected_response" ]] || echo "$response" | grep -q "$expected_response"; then
            echo -e "${GREEN}✅ Online${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Responding but unexpected format${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Offline${NC}"
        return 1
    fi
}

echo
echo "=== Current Versions ==="
echo "Ollama: $(ollama --version 2>/dev/null || echo 'Not installed')"
echo "Node: $(node --version 2>/dev/null || echo 'Not installed')"
echo "NPM: $(npm --version 2>/dev/null || echo 'Not installed')"

echo
echo "=== Service Status ==="
check_service "Ollama API" "http://localhost:11434/api/tags" "models"
check_service "ChromaDB" "http://localhost:8000/api/v2/heartbeat" ""

echo
echo "=== Available Models ==="
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    models=$(curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null)
    if [ -n "$models" ]; then
        echo "$models" | sed 's/^/  ✅ /'
        model_count=$(echo "$models" | wc -l)
        echo "Total: $model_count models"
    else
        echo -e "  ${YELLOW}⚠️  No models found${NC}"
    fi
else
    echo -e "  ${RED}❌ Cannot connect to Ollama${NC}"
fi

echo
echo "=== Quick Model Test ==="
if curl -s http://localhost:11434/api/tags | grep -q "tinydolphin:latest"; then
    echo -n "Testing tinydolphin:latest generation: "
    if curl -s -X POST http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d '{"model": "tinydolphin:latest", "prompt": "Say hello", "stream": false}' \
        | grep -q "response"; then
        echo -e "${GREEN}✅ Working${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  tinydolphin:latest not available for test${NC}"
fi

echo
echo "=== Running Processes ==="
ollama_processes=$(pgrep -f "ollama" | wc -l)
chroma_processes=$(pgrep -f "chroma" | wc -l)
electron_processes=$(pgrep -f "electron" | wc -l)

echo "Ollama processes: $ollama_processes"
echo "ChromaDB processes: $chroma_processes" 
echo "Electron processes: $electron_processes"

echo
echo "=== Network Ports ==="
if command -v netstat >/dev/null; then
    echo "Port 11434 (Ollama): $(netstat -tulpn 2>/dev/null | grep :11434 | wc -l) listener(s)"
    echo "Port 8000 (ChromaDB): $(netstat -tulpn 2>/dev/null | grep :8000 | wc -l) listener(s)"
else
    echo "netstat not available - skipping port check"
fi

echo
echo "=== Disk Usage ==="
if [ -d ~/.ollama ]; then
    ollama_size=$(du -sh ~/.ollama 2>/dev/null | cut -f1)
    echo "Ollama models storage: $ollama_size"
else
    echo "Ollama models directory not found"
fi

if [ -d "chroma-data" ]; then
    chroma_size=$(du -sh chroma-data 2>/dev/null | cut -f1)
    echo "ChromaDB data: $chroma_size"
else
    echo "ChromaDB data directory not found"
fi

echo
echo "=== Recommendations ==="

# Check if ready for upgrade
ready_for_upgrade=true

if ! command -v ollama >/dev/null; then
    echo -e "${RED}❌ Ollama not installed${NC}"
    ready_for_upgrade=false
fi

if ! curl -s http://localhost:11434/api/tags >/dev/null; then
    echo -e "${YELLOW}⚠️  Ollama service not running - start with: ollama serve &${NC}"
fi

if ! curl -s http://localhost:8000/api/v2/heartbeat >/dev/null; then
    echo -e "${YELLOW}⚠️  ChromaDB not running - start with: cd chroma-data && /Users/jibbr/.local/bin/chroma run --port 8000 &${NC}"
fi

current_version=$(ollama --version 2>/dev/null | grep -o 'version [0-9.]*' | cut -d' ' -f2)
if [[ $current_version =~ ^2\. ]]; then
    echo -e "${GREEN}✅ Already running Ollama v2!${NC}"
elif [[ $current_version =~ ^0\. ]]; then
    echo -e "${GREEN}✅ Ready for Ollama v2 upgrade${NC}"
    echo "   Run: ./upgrade-ollama-v2.sh"
else
    echo -e "${YELLOW}⚠️  Unknown Ollama version: $current_version${NC}"
fi

echo
echo "=== Summary ==="
if $ready_for_upgrade; then
    echo -e "${GREEN}✅ System appears ready for operation/upgrade${NC}"
else
    echo -e "${RED}❌ Issues detected - resolve before proceeding${NC}"
fi

echo
echo "To upgrade to Ollama v2: ./upgrade-ollama-v2.sh"
echo "To start PelicanOS: npm run dev"
