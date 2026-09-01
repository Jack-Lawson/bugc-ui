#!/bin/bash

# iOS Setup and Initialization Script
# Run this script to set up the iOS development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== iOS Development Environment Setup ===${NC}"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${RED}Error: This script must be run on macOS${NC}"
  exit 1
fi

# Step 1: Check Xcode installation
echo -e "${YELLOW}Step 1: Checking Xcode installation...${NC}"
if ! command -v xcodebuild &> /dev/null; then
  echo -e "${RED}Error: Xcode Command Line Tools not found${NC}"
  echo "Please install Xcode Command Line Tools with:"
  echo "  xcode-select --install"
  exit 1
fi

XCODE_VERSION=$(xcodebuild -version | grep Xcode | awk '{print $2}')
echo -e "${GREEN}Xcode $XCODE_VERSION found${NC}"
echo ""

# Step 2: Check Node.js and npm
echo -e "${YELLOW}Step 2: Checking Node.js and npm...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js not found${NC}"
  echo "Please install Node.js from https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}Node.js $NODE_VERSION and npm $NPM_VERSION found${NC}"
echo ""

# Step 3: Install/Update CocoaPods
echo -e "${YELLOW}Step 3: Setting up CocoaPods...${NC}"
if ! command -v pod &> /dev/null; then
  echo "Installing CocoaPods..."
  sudo gem install cocoapods
else
  POD_VERSION=$(pod --version)
  echo -e "${GREEN}CocoaPods $POD_VERSION found${NC}"
fi
echo ""

# Step 4: Install npm dependencies
echo -e "${YELLOW}Step 4: Installing npm dependencies...${NC}"
npm ci
echo -e "${GREEN}npm dependencies installed${NC}"
echo ""

# Step 5: Install Capacitor CLI globally (optional)
echo -e "${YELLOW}Step 5: Checking Capacitor CLI...${NC}"
if npm list -g @capacitor/cli &> /dev/null; then
  echo -e "${GREEN}Capacitor CLI found globally${NC}"
else
  echo "Installing Capacitor CLI globally..."
  npm install -g @capacitor/cli
fi
echo ""

# Step 6: Create .env.ios if not exists
echo -e "${YELLOW}Step 6: Setting up environment configuration...${NC}"
if [ ! -f ".env.ios" ]; then
  if [ -f ".env.ios.example" ]; then
    cp .env.ios.example .env.ios
    echo -e "${YELLOW}Created .env.ios from template${NC}"
    echo "Please edit .env.ios with your API endpoints:"
    echo "  VITE_API_BASE_URL - Your backend API URL (must be HTTPS)"
    echo "  VITE_WS_BASE_URL - Your WebSocket URL (must be WSS)"
  else
    echo -e "${RED}Warning: .env.ios.example not found${NC}"
  fi
else
  echo -e "${GREEN}.env.ios already exists${NC}"
fi
echo ""

# Step 7: Build web assets
echo -e "${YELLOW}Step 7: Building web assets for iOS...${NC}"
npm run build:ios
echo -e "${GREEN}Web assets built${NC}"
echo ""

# Step 8: Add iOS platform
echo -e "${YELLOW}Step 8: Adding iOS platform to Capacitor...${NC}"
if [ ! -d "ios" ]; then
  npx cap add ios
  echo -e "${GREEN}iOS platform added${NC}"
else
  echo -e "${GREEN}iOS platform already exists${NC}"
fi
echo ""

# Step 9: Sync Capacitor
echo -e "${YELLOW}Step 9: Syncing Capacitor...${NC}"
npx cap sync ios
echo -e "${GREEN}Capacitor synced${NC}"
echo ""

# Step 10: Install Pod dependencies
echo -e "${YELLOW}Step 10: Installing CocoaPods dependencies...${NC}"
if [ -d "ios/App" ]; then
  cd ios/App
  pod install --repo-update
  cd ../..
  echo -e "${GREEN}Pod dependencies installed${NC}"
else
  echo -e "${YELLOW}Warning: ios/App directory not found${NC}"
fi
echo ""

# Step 11: Display next steps
echo -e "${BLUE}=== Setup Complete ===${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Open iOS project:"
echo "   npm run ios:open"
echo ""
echo "2. Configure signing:"
echo "   - Open ios/App/App.xcworkspace in Xcode"
echo "   - Select the App target"
echo "   - Go to Signing & Capabilities"
echo "   - Select your development team"
echo ""
echo "3. Build and run:"
echo "   npm run ios:run"
echo ""
echo "4. Build IPA for distribution:"
echo "   ./scripts/build-ios-ipa.sh release"
echo ""
echo "For more information, see:"
echo "  - Capacitor iOS docs: https://capacitorjs.com/docs/ios"
echo "  - Xcode documentation"
