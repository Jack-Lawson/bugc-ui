#!/bin/bash

# iOS IPA Build Script
# Usage: ./scripts/build-ios-ipa.sh [release|debug] [--team-id YOUR_TEAM_ID] [--provisioning-profile PROFILE_NAME]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BUILD_TYPE="${1:-release}"
TEAM_ID="${TEAM_ID:-}"
PROVISIONING_PROFILE="${PROVISIONING_PROFILE:-}"
SIGNING_CERTIFICATE="iPhone Developer"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --team-id)
      TEAM_ID="$2"
      shift 2
      ;;
    --provisioning-profile)
      PROVISIONING_PROFILE="$2"
      shift 2
      ;;
    --signing-certificate)
      SIGNING_CERTIFICATE="$2"
      shift 2
      ;;
    release|debug)
      BUILD_TYPE="$1"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Print configuration
echo -e "${GREEN}=== iOS IPA Build Configuration ===${NC}"
echo "Build Type: $BUILD_TYPE"
echo "Team ID: ${TEAM_ID:-not set}"
echo "Provisioning Profile: ${PROVISIONING_PROFILE:-not set}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js not found${NC}"
  exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
  echo -e "${RED}Error: Xcode Command Line Tools not found${NC}"
  exit 1
fi

if ! command -v pod &> /dev/null; then
  echo -e "${RED}Error: CocoaPods not found. Install with: sudo gem install cocoapods${NC}"
  exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# Step 1: Build web assets
echo -e "${YELLOW}Step 1: Building web assets for iOS...${NC}"
if [ -f ".env.ios" ]; then
  npm run build:ios
else
  echo -e "${YELLOW}Warning: .env.ios not found. Using .env.ios.example${NC}"
  cp .env.ios.example .env.ios
  npm run build:ios
fi
echo -e "${GREEN}Web assets built successfully${NC}"
echo ""

# Step 2: Sync Capacitor
echo -e "${YELLOW}Step 2: Syncing Capacitor...${NC}"
npx cap sync ios
echo -e "${GREEN}Capacitor synced${NC}"
echo ""

# Step 3: Install Pod dependencies
echo -e "${YELLOW}Step 3: Installing CocoaPods dependencies...${NC}"
cd ios/App
pod install --repo-update
cd ../..
echo -e "${GREEN}Pod dependencies installed${NC}"
echo ""

# Step 4: Build the app
echo -e "${YELLOW}Step 4: Building iOS app (${BUILD_TYPE})...${NC}"
cd ios/App

if [ "$BUILD_TYPE" = "debug" ]; then
  xcodebuild -workspace App.xcworkspace \
    -scheme App \
    -configuration Debug \
    -derivedDataPath build \
    -arch arm64 \
    build
else
  xcodebuild -workspace App.xcworkspace \
    -scheme App \
    -configuration Release \
    -derivedDataPath build \
    -arch arm64 \
    build
fi

echo -e "${GREEN}App built successfully${NC}"
echo ""

# Step 5: Create archive
echo -e "${YELLOW}Step 5: Creating iOS App Archive...${NC}"
if [ "$BUILD_TYPE" = "debug" ]; then
  xcodebuild -workspace App.xcworkspace \
    -scheme App \
    -configuration Debug \
    -derivedDataPath build \
    -archivePath build/App.xcarchive \
    archive
else
  xcodebuild -workspace App.xcworkspace \
    -scheme App \
    -configuration Release \
    -derivedDataPath build \
    -archivePath build/App.xcarchive \
    archive
fi

echo -e "${GREEN}Archive created successfully${NC}"
echo ""

# Step 6: Export IPA
echo -e "${YELLOW}Step 6: Exporting IPA...${NC}"

# Create or update exportOptions.plist
EXPORT_PLIST="../../exportOptions.plist"
if [ ! -f "$EXPORT_PLIST" ]; then
  echo -e "${YELLOW}Creating exportOptions.plist...${NC}"
  cat > "$EXPORT_PLIST" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>destination</key>
  <string>generic/platform=iOS</string>
  <key>method</key>
  <string>app-store</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
</dict>
</plist>
EOF
fi

xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -exportPath build/ipa

echo -e "${GREEN}IPA exported successfully${NC}"
echo ""

# Step 7: Verify output
IPA_FILE=$(find build/ipa -name "*.ipa" -type f 2>/dev/null | head -1)
if [ -n "$IPA_FILE" ]; then
  IPA_SIZE=$(du -h "$IPA_FILE" | cut -f1)
  echo -e "${GREEN}=== Build Complete ===${NC}"
  echo "IPA file: $IPA_FILE"
  echo "Size: $IPA_SIZE"
  echo ""
  echo -e "${GREEN}IPA is ready for distribution!${NC}"
else
  echo -e "${RED}Error: IPA file not found${NC}"
  exit 1
fi

cd ../..
