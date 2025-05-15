#!/bin/bash
# Script to build the application
# Supports FR-MVP-01: Code Integration and Automated Build

set -e  # Exit immediately if a command exits with a non-zero status

echo "Starting application build process..."

# Install Node.js dependencies
echo "Installing dependencies..."
npm ci

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy source files to dist (simple build process for demo)
echo "Building the application..."
cp -R src/* dist/

# Verify build success
if [ $? -eq 0 ]; then
    echo "Build completed successfully."
    
    # Create build info file for traceability
    echo "Creating build info file..."
    BUILD_INFO="Build timestamp: $(date)"
    BUILD_INFO="${BUILD_INFO}\nCommit: ${GITHUB_SHA:-local-build}"
    BUILD_INFO="${BUILD_INFO}\nBuild number: ${GITHUB_RUN_NUMBER:-local-run}"
    echo -e $BUILD_INFO > ./dist/build-info.txt
    
    exit 0
else
    echo "Build failed."
    exit 1
fi