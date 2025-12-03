#!/bin/bash

# Script to create pages.spec.ts for visual regression testing
# Run this in your project root: ./create-test-file.sh [path/to/tests/visual] [import-path] [wait-for-selector]
# Example: ./create-test-file.sh tests/visual @playwright/test ".loading-spinner"

TARGET_DIR="${1:-tests/visual}"
IMPORT_PATH="${2:-@playwright/test}"
WAIT_FOR_SELECTOR="${3:-}"

# Create directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Generate wait logic based on whether selector is provided
if [ -n "$WAIT_FOR_SELECTOR" ]; then
  WAIT_LOGIC="
  // Wait for loading indicator to disappear
  await page.waitForFunction(() => {
    const noLoading = !document.querySelector("$WAIT_FOR_SELECTOR");
    return document.readyState === \"complete\" && noLoading;
  });"
else
  WAIT_LOGIC="
  // Wait for the page to be fully loaded
  await page.waitForLoadState(\"networkidle\");"
fi

# Create the test file
cat > "$TARGET_DIR/pages.spec.ts" << TESTFILE
import { expect, test } from "$IMPORT_PATH";

test("visual test", async ({ page }) => {
  const testUrl = process.env.TEST_URL || "http://localhost:3000/";

  // Authentication bypass should be handled via environment variables and middleware
  // in your project.
  // configured in VS Code settings (e.g., NEXT_PUBLIC_PLAYWRIGHT=true)

  await page.goto(testUrl);
$WAIT_LOGIC

  // Generate unique filename from URL path
  const urlPath = new URL(testUrl).pathname;
  const filename = urlPath
    .replace(/^\//, "") // Remove leading slash
    .replace(/\//g, "-") // Replace slashes with hyphens
    .replace(/[^a-zA-Z0-9-_]/g, "_") // Replace special chars with underscores
    || "homepage"; // Default name for root path

  await expect(page).toHaveScreenshot(\`\${filename}.png\`, { fullPage: true });
});
TESTFILE

echo "✅ Created $TARGET_DIR/pages.spec.ts"
if [ -n "$WAIT_FOR_SELECTOR" ]; then
  echo "   Configured to wait for selector: $WAIT_FOR_SELECTOR"
fi
