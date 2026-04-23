#!/usr/bin/env bash
# deploy.sh - Full interactive deployment of a UiPath coded app
# Usage: bash deploy.sh [environment]
#
# Must be run from the app's root directory (where package.json lives).
#
# Arguments:
#   environment  cloud (default), alpha, staging
#
# This script is INTERACTIVE - it opens a browser for OAuth and prompts
# for input during registration. Run it directly in your terminal.
#
# Steps performed:
#   1. Checks prerequisites (uipath CLI, package.json, node_modules)
#   2. Authenticates via browser OAuth (uipath auth)
#   3. Registers the app (uipath register app)
#   4. Builds the app (npm run build)
#   5. Packages the app (uipath pack)
#   6. Publishes the package to UiPath Orchestrator (uipath publish)

set -euo pipefail

ENV_INPUT="${1:-cloud}"

case "$ENV_INPUT" in
  cloud)
    AUTH_FLAG=""
    ;;
  alpha)
    AUTH_FLAG="--alpha"
    ;;
  staging)
    AUTH_FLAG="--staging"
    ;;
  *)
    echo "ERROR: Unknown environment '$ENV_INPUT'. Use: cloud, alpha, or staging."
    exit 1
    ;;
esac

echo ""
echo "========================================="
echo "  UiPath Coded App Deployment"
echo "========================================="
echo "  Environment: $ENV_INPUT"
echo "  Directory:   $(pwd)"
echo ""

if ! command -v uipath &> /dev/null; then
  echo "ERROR: 'uipath' CLI not found. Install it with:"
  echo "  npm install -g @uipath/uipath-ts-cli"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "ERROR: No package.json found. Run this script from the app's root directory."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "==> Installing dependencies..."
  npm install
fi

echo "==> Step 1/5: Authenticating with UiPath..."
echo "   (This will open your browser for OAuth login)"
echo ""
if [ -n "$AUTH_FLAG" ]; then
  uipath auth "$AUTH_FLAG"
else
  uipath auth
fi
echo ""
echo "   Authentication complete."

echo ""
echo "==> Step 2/5: Registering app..."
echo "   (Follow the prompts to register your coded app)"
echo ""
uipath register app
echo ""
echo "   Registration complete."

echo ""
echo "==> Step 3/5: Building app..."
npm run build

DIST_DIR="dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: Build directory '$DIST_DIR' does not exist. Build may have failed."
  exit 1
fi
echo "   Build complete."

echo ""
echo "==> Step 4/5: Packaging app..."
uipath pack ./"$DIST_DIR"
echo "   Packaging complete."

echo ""
echo "==> Step 5/5: Publishing package to UiPath Orchestrator..."
uipath publish

echo ""
echo "========================================="
echo "  Publish complete!"
echo "========================================="
echo ""
