#!/bin/bash

# 🚀 PelicanOS Ollama v2 Upgrade Script
# Safe, intelligent upgrade with full validation

set -e  # Exit on any error

echo "🕊️  PelicanOS Ollama v2 Upgrade Started"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if script is run from project directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    log_error "Please run this script from the PelicanOS project directory"
    exit 1
fi

echo
log_info "Phase 1: Pre-Upgrade Assessment"
echo "=================================="

# Check current Ollama version
current_version=$(ollama --version 2>/dev/null || echo "Not installed")
log_info "Current Ollama version: $current_version"

# Test current API
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    log_info "✅ Ollama API is responding"
    model_count=$(curl -s http://localhost:11434/api/tags | jq '.models | length' 2>/dev/null || echo "unknown")
    log_info "Available models: $model_count"
else
    log_warn "⚠️  Ollama API not responding - may need to start service"
fi

# Check ChromaDB
if curl -s http://localhost:8000/api/v2/heartbeat >/dev/null 2>&1; then
    log_info "✅ ChromaDB is responding"
else
    log_warn "⚠️  ChromaDB not responding on port 8000"
fi

echo
read -p "Continue with backup and upgrade? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    log_info "Upgrade cancelled by user"
    exit 0
fi

echo
log_info "Phase 2: Creating Backups"
echo "========================="

# Create backup directory with timestamp
backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"

# Backup models list
log_info "Backing up model list..."
ollama list > "$backup_dir/models_list.txt" 2>/dev/null || log_warn "Could not backup model list"

# Backup ChromaDB data
log_info "Backing up ChromaDB data..."
if [ -d "chroma-data" ]; then
    cp -r chroma-data "$backup_dir/chroma-data-backup"
    log_info "✅ ChromaDB data backed up"
else
    log_warn "No chroma-data directory found"
fi

# Backup current config
log_info "Saving current configuration..."
{
    echo "=== Pre-Upgrade System State ==="
    echo "Date: $(date)"
    echo "Ollama Version: $(ollama --version 2>/dev/null || echo 'Not available')"
    echo "Node Version: $(node --version)"
    echo "NPM Version: $(npm --version)"
    echo ""
    echo "=== Running Processes ==="
    ps aux | grep -E "(ollama|chroma)" | grep -v grep
    echo ""
    echo "=== Network Ports ==="
    netstat -tulpn 2>/dev/null | grep -E "(11434|8000)" || echo "No services detected"
} > "$backup_dir/system_state.txt"

log_info "✅ Backup completed in: $backup_dir"

echo
log_info "Phase 3: Stopping Services"
echo "=========================="

# Stop PelicanOS if running
log_info "Stopping PelicanOS app..."
pkill -f "electron" 2>/dev/null && log_info "✅ Electron stopped" || log_info "No Electron process found"

# Stop Ollama
log_info "Stopping Ollama service..."
pkill -f "ollama serve" 2>/dev/null && log_info "✅ Ollama stopped" || log_info "No Ollama process found"

# Verify clean shutdown
sleep 3
if pgrep -f "ollama" >/dev/null; then
    log_warn "Ollama still running, force stopping..."
    pkill -9 -f "ollama"
    sleep 2
fi

echo
log_info "Phase 4: Installing Ollama v2"
echo "============================="

log_info "Downloading and installing Ollama v2..."
if curl -fsSL https://ollama.com/install.sh | sh; then
    log_info "✅ Ollama v2 installation completed"
else
    log_error "❌ Failed to install Ollama v2"
    log_error "Please check your internet connection and try manual installation"
    exit 1
fi

# Verify installation
new_version=$(ollama --version 2>/dev/null || echo "Installation failed")
log_info "New Ollama version: $new_version"

if [[ ! $new_version =~ ^ollama[[:space:]]+version[[:space:]]+2\. ]]; then
    log_error "❌ Ollama v2 installation may have failed"
    log_error "Expected version 2.x.x, got: $new_version"
    read -p "Continue anyway? (y/N): " continue_anyway
    if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo
log_info "Phase 5: Starting and Testing Services"
echo "======================================"

# Start Ollama
log_info "Starting Ollama v2 service..."
ollama serve > /tmp/ollama.log 2>&1 &
ollama_pid=$!

# Wait for Ollama to start
log_info "Waiting for Ollama to initialize..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        log_info "✅ Ollama v2 is responding after ${i} seconds"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "❌ Ollama failed to start within 30 seconds"
        log_error "Check logs: tail /tmp/ollama.log"
        exit 1
    fi
    sleep 1
done

# Test API endpoints
log_info "Testing API compatibility..."

# Test models endpoint
if curl -s http://localhost:11434/api/tags >/dev/null; then
    log_info "✅ Models API working"
else
    log_error "❌ Models API failed"
    exit 1
fi

# Test generation endpoint
log_info "Testing generation API..."
if curl -s -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d '{"model": "tinydolphin:latest", "prompt": "test", "stream": false}' >/dev/null; then
    log_info "✅ Generation API working"
else
    log_warn "⚠️  Generation API test failed - models may need to be re-pulled"
fi

echo
log_info "Phase 6: Model Verification"
echo "=========================="

# Get available models
models=$(curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null || echo "")

if [ -z "$models" ]; then
    log_warn "⚠️  No models found - you may need to re-pull them"
    log_info "Expected models from backup:"
    cat "$backup_dir/models_list.txt" 2>/dev/null || echo "Backup not available"
    
    echo
    read -p "Re-pull models automatically? (y/N): " repull
    if [[ $repull =~ ^[Yy]$ ]]; then
        log_info "Re-pulling essential models..."
        ollama pull tinydolphin:latest &
        ollama pull openchat:latest &
        ollama pull phi4-mini-reasoning:latest &
        ollama pull deepseek-coder:1.3b &
        wait
        log_info "✅ Models re-pulled"
    fi
else
    log_info "✅ Found models:"
    echo "$models" | sed 's/^/  - /'
fi

echo
log_info "Phase 7: Starting ChromaDB"
echo "========================="

# Start ChromaDB if chroma-data exists
if [ -d "chroma-data" ]; then
    cd chroma-data
    log_info "Starting ChromaDB..."
    /Users/jibbr/.local/bin/chroma run --port 8000 > /tmp/chroma.log 2>&1 &
    chroma_pid=$!
    cd ..
    
    # Wait for ChromaDB
    log_info "Waiting for ChromaDB to start..."
    for i in {1..15}; do
        if curl -s http://localhost:8000/api/v2/heartbeat >/dev/null 2>&1; then
            log_info "✅ ChromaDB is responding after ${i} seconds"
            break
        fi
        if [ $i -eq 15 ]; then
            log_warn "⚠️  ChromaDB failed to start - you may need to start it manually"
        fi
        sleep 1
    done
else
    log_warn "⚠️  No chroma-data directory found"
fi

echo
log_info "Phase 8: Final Verification"
echo "=========================="

# Create verification report
{
    echo "=== PelicanOS Ollama v2 Upgrade Report ==="
    echo "Date: $(date)"
    echo "Backup Location: $backup_dir"
    echo ""
    echo "=== Service Status ==="
    echo "Ollama Version: $(ollama --version)"
    echo -n "Ollama API: "
    if curl -s http://localhost:11434/api/tags >/dev/null; then
        echo "✅ Responding"
    else
        echo "❌ Not responding"
    fi
    
    echo -n "ChromaDB API: "
    if curl -s http://localhost:8000/api/v2/heartbeat >/dev/null; then
        echo "✅ Responding"
    else
        echo "❌ Not responding"
    fi
    
    echo ""
    echo "=== Available Models ==="
    ollama list
    
} > "$backup_dir/upgrade_report.txt"

log_info "✅ Upgrade verification report saved: $backup_dir/upgrade_report.txt"

echo
log_info "🎉 Ollama v2 Upgrade Complete!"
echo "=============================="
log_info "Next steps:"
log_info "1. Start PelicanOS: npm run dev"
log_info "2. Check service status indicators in the app"
log_info "3. Test chat functionality"
log_info "4. Verify conversation memory works"
echo
log_info "If you encounter issues:"
log_info "- Check logs: /tmp/ollama.log and /tmp/chroma.log"
log_info "- Review upgrade report: $backup_dir/upgrade_report.txt"
log_info "- Restore from backup if needed"
echo
log_info "Backup location: $backup_dir"
echo "🚀 Happy chatting with Ollama v2!"
