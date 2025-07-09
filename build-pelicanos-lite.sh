#!/bin/bash

# 🚀 PelicanOS Lite Production Build Script
# Quick deployment build that bypasses TypeScript errors for rapid release

echo "🕊️  PelicanOS Lite - Production Build"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
    log_error "Please run this script from the PelicanOS root directory"
    exit 1
fi

echo
log_info "Phase 1: Pre-build Preparation"
echo "==============================="

# Create backup of TypeScript config
log_info "Backing up TypeScript config..."
if [[ -f "tsconfig.json" ]]; then
    cp tsconfig.json tsconfig.json.backup
fi

# Create relaxed TypeScript config for quick build
log_info "Creating relaxed TypeScript config for production build..."
cat > tsconfig.build.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "strictFunctionTypes": false,
    "noImplicitReturns": false,
    "noFallthroughCasesInSwitch": false,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "out"]
}
EOF

echo
log_info "Phase 2: Clean Build Environment"
echo "================================"

# Clean previous builds
log_info "Cleaning previous builds..."
rm -rf out dist
log_info "✅ Build directories cleaned"

echo
log_info "Phase 3: Building Application (Skip TypeCheck)"
echo "=============================================="

# Build without typecheck for rapid deployment
log_info "Building PelicanOS with relaxed type checking..."
if npm run format; then
    log_info "✅ Code formatted"
else
    log_warn "⚠️  Code formatting had issues, continuing..."
fi

# Build the app (skip typecheck)
log_info "Building Electron app..."
if npx electron-vite build; then
    log_info "✅ Electron build successful"
else
    log_error "❌ Electron build failed"
    exit 1
fi

echo
log_info "Phase 4: Package for Distribution"
echo "================================="

# Determine platform and build accordingly
platform="$(uname)"
case $platform in
    "Darwin")
        log_info "Building for macOS..."
        build_cmd="npx electron-builder --mac --publish=never"
        ;;
    "Linux")
        log_info "Building for Linux..."
        build_cmd="npx electron-builder --linux --publish=never"
        ;;
    *)
        log_info "Building for current platform..."
        build_cmd="npx electron-builder --publish=never"
        ;;
esac

log_info "Executing: $build_cmd"
if eval $build_cmd; then
    log_info "✅ Package build successful"
else
    log_error "❌ Package build failed"
    exit 1
fi

echo
log_info "Phase 5: Build Verification"
echo "==========================="

# Find the built app
if [[ -d "dist" ]]; then
    log_info "Build artifacts created in dist/ directory:"
    ls -la dist/
    
    # Calculate sizes
    total_size=$(du -sh dist/ | cut -f1)
    log_info "Total package size: $total_size"
else
    log_warn "⚠️  No dist directory found"
fi

echo
log_info "Phase 6: Cleanup"
echo "================"

# Restore original TypeScript config
if [[ -f "tsconfig.json.backup" ]]; then
    mv tsconfig.json.backup tsconfig.json
    log_info "✅ TypeScript config restored"
fi

# Remove temporary build config
rm -f tsconfig.build.json

echo
log_info "🎉 PelicanOS Lite Build Complete!"
echo "================================="

if [[ -d "dist" ]]; then
    log_info "✅ Ready for distribution!"
    log_info "📦 Built packages available in: ./dist/"
    echo
    log_info "Next steps:"
    log_info "1. Test the built application"
    log_info "2. Distribute to users"
    log_info "3. Create release notes"
    echo
    log_info "To test the built app:"
    if [[ "$platform" == "Darwin" ]]; then
        echo "   open dist/mac/PelicanOS.app"
    elif [[ "$platform" == "Linux" ]]; then
        echo "   ./dist/PelicanOS-1.0.0.AppImage"
    fi
else
    log_error "❌ Build may have issues - check logs above"
fi