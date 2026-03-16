#!/bin/bash
# Launch Project M app
APP_PATH="$HOME/Applications/ProjectM.app"
SOURCE_APP="$(dirname "$0")/../release/mac-arm64/ProjectM.app"

# Copy/update the app
if [ -d "$SOURCE_APP" ]; then
  echo "Updating app..."
  rm -rf "$APP_PATH"
  cp -R "$SOURCE_APP" "$APP_PATH"
  xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null || true
fi

echo "Launching ProjectM..."
osascript -e "set theApp to POSIX file \"$APP_PATH\"
tell application \"Finder\" to open theApp"
