#!/bin/bash

echo "🔧 Building and testing PelicanOS..."
echo ""

cd /Users/jibbr/Desktop/Wonder/PelicanOS

echo "📦 Building the application..."
if npm run build:main; then
    echo "✅ Main process build successful"
else
    echo "❌ Main process build failed"
    exit 1
fi

echo ""
echo "🔧 Type checking..."
if npm run type-check; then
    echo "✅ Type checking passed"
else
    echo "❌ Type checking failed"
    exit 1
fi

echo ""
echo "🚀 Application should now connect to services properly!"
echo ""
echo "📋 Summary of fixes applied:"
echo "  ✅ Fixed duplicate exports in agents.ts"
echo "  ✅ Corrected Ollama path (/usr/local/bin/ollama)"
echo "  ✅ Fixed preload return types to match main process"
echo "  ✅ Added detailed logging for debugging"
echo ""
echo "💡 The app should now properly detect and connect to Ollama and ChromaDB!"
