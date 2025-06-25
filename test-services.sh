#!/bin/bash

echo "🔍 Testing Ollama and Chroma connectivity..."
echo ""

echo "📡 Testing Ollama (http://127.0.0.1:11434/api/tags):"
if curl -s --connect-timeout 5 "http://127.0.0.1:11434/api/tags" > /dev/null; then
    echo "✅ Ollama is responding"
    echo "📋 Models available:"
    curl -s "http://127.0.0.1:11434/api/tags" | jq '.models[].name' 2>/dev/null || echo "   (jq not available for parsing)"
else
    echo "❌ Ollama is not responding"
fi

echo ""
echo "📡 Testing ChromaDB (http://127.0.0.1:8000/api/v2/heartbeat):"
if curl -s --connect-timeout 5 "http://127.0.0.1:8000/api/v2/heartbeat" > /dev/null; then
    echo "✅ ChromaDB is responding"
    echo "💓 Heartbeat response:"
    curl -s "http://127.0.0.1:8000/api/v2/heartbeat"
    echo ""
else
    echo "❌ ChromaDB is not responding"
fi

echo ""
echo "🔍 Process status:"
echo "Ollama processes:"
ps aux | grep -E "ollama" | grep -v grep
echo ""
echo "Chroma processes:"
ps aux | grep -E "chroma" | grep -v grep

echo ""
echo "🌐 Port status:"
echo "Port 11434 (Ollama):"
netstat -an | grep 11434
echo "Port 8000 (ChromaDB):"
netstat -an | grep 8000
