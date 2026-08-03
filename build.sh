#!/bin/bash
# One-off build. Output goes in _site/ — that's what actually gets deployed.
# Run this with: ./build.sh
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

npx @11ty/eleventy
echo "Built into _site/"
