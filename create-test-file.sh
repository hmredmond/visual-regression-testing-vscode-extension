#!/bin/bash

# Script to create pages.spec.ts for visual regression testing
# Run this in your project root: ./create-test-file.sh [path/to/tests/visual] [import-path]

TARGET_DIR="${1:-tests/visual}"
IMPORT_PATH="${2:-@playwright/test}"

# Create directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Create the test file
cat > "$TARGET_DIR/pages.spec.ts" << TESTFILE
import { expect, test } from "$IMPORT_PATH";

test("visual test for homepage", async ({ page }) => {
  const testUrl = process.env.TEST_URL || "http://localhost:3000/";

  // Authentication bypass is handled via environment variables
  // configured in VS Code settings (e.g., NEXT_PUBLIC_PLAYWRIGHT=true)

  await page.goto(testUrl);

  // Wait for the page to be fully loaded
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot("homepage.png", { fullPage: true });
});
TESTFILE

echo "✅ Created $TARGET_DIR/pages.spec.ts"
