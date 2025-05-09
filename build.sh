#!/bin/bash

# Exit on error
set -e

# Print commands before executing
set -x

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building the application..."
npm run build

# Deploy to Firebase
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

echo "Deployment completed successfully!"
