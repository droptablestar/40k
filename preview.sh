#!/bin/bash
# Build the site and serve it locally with live reload.
# Run this with: ./preview.sh
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

npx @11ty/eleventy --serve
