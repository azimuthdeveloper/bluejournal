#!/bin/bash

# Exit on error
set -e

# Print commands before executing
set -x

# Install dependencies
echo "Installing dependencies..."
npm install

# Create PWA icons from blueprinceicon.png
echo "Creating PWA icons from blueprinceicon.png..."
mkdir -p src/assets/icons

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
  # Resize the icon to various sizes
  convert blueprinceicon.png -resize 72x72 src/assets/icons/icon-72x72.png
  convert blueprinceicon.png -resize 96x96 src/assets/icons/icon-96x96.png
  convert blueprinceicon.png -resize 128x128 src/assets/icons/icon-128x128.png
  convert blueprinceicon.png -resize 144x144 src/assets/icons/icon-144x144.png
  convert blueprinceicon.png -resize 152x152 src/assets/icons/icon-152x152.png
  convert blueprinceicon.png -resize 192x192 src/assets/icons/icon-192x192.png
  convert blueprinceicon.png -resize 384x384 src/assets/icons/icon-384x384.png
  convert blueprinceicon.png -resize 512x512 src/assets/icons/icon-512x512.png
  echo "PWA icons created successfully."
else
  echo "Warning: ImageMagick is not installed. PWA icons will not be created."
  echo "Please install ImageMagick or manually create the PWA icons."
  # Copy the original icon to the assets directory as a fallback
  cp blueprinceicon.png src/assets/icons/icon-512x512.png
fi

# Get the current git commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)
echo "Current git commit hash: $COMMIT_HASH"

# Replace the placeholder in the GitInfoService
echo "Replacing GIT_COMMIT_HASH placeholder with actual commit hash..."
sed -i.bak "s/GIT_COMMIT_HASH/$COMMIT_HASH/g" src/app/services/git-info.service.ts

# Build the application
echo "Building the application..."
npm run build

# Restore the original GitInfoService file
mv src/app/services/git-info.service.ts.bak src/app/services/git-info.service.ts

# Deploy to Firebase
echo "Checking for Firebase deployment..."

# Check if we're in a CI environment or if deployment is explicitly requested
if [ -n "$CI" ] || [ -n "$DEPLOY_TO_FIREBASE" ]; then
  echo "Deploying to Firebase..."

  # Check if Firebase token is provided
  if [ -z "$FIREBASE_TOKEN" ]; then
    echo "Error: FIREBASE_TOKEN environment variable is not set."
    echo "Please set the FIREBASE_TOKEN environment variable with your Firebase CI token."
    echo "You can generate a token using: firebase login:ci"
    exit 1
  fi

  # Install Firebase CLI if not already installed
  if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
  fi

  # Deploy to Firebase using the provided token
  firebase deploy --token "$FIREBASE_TOKEN" --non-interactive
else
  # If running locally and not explicitly requesting deployment
  echo "Skipping Firebase deployment (not in CI environment and DEPLOY_TO_FIREBASE not set)."
  echo "To deploy manually, run: firebase deploy"
  echo "Or set DEPLOY_TO_FIREBASE=1 before running this script."
fi

echo "Deployment completed successfully!"
