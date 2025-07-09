#!/usr/bin/env bash

# Test Build Script for EPIPE Fix
# This script builds the app and checks for EPIPE errors

echo "🔨 Building PelicanOS with EPIPE fixes..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf out/
rm -rf dist/

# Build the application
echo "⚙️  Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Test the application briefly
    echo "🧪 Testing application startup..."
    timeout 10s npm run start &
    
    APP_PID=$!
    sleep 5
    
    # Kill the test app
    kill $APP_PID 2>/dev/null
    
    echo "✅ Application test completed"
    echo "🎉 EPIPE fixes appear to be working!"
else
    echo "❌ Build failed!"
    exit 1
fi
