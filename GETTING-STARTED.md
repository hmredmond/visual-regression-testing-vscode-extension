# Getting Started with Visual Regression Testing Extension

This tutorial walks you through testing the extension by making a visual change and catching it with visual regression testing.

## Installation

1. Install the `visual-regression-testing-with-playwright.vsix` file from [Marketplace](https://marketplace.visualstudio.com/items?itemName=HannahRedmond.visual-regression-testing-with-playwright)

Or

2. Install directly in VS Code:
  - Open VS Code
  - Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux) to open Extensions view
  - Search for "Visual Regression Testing with Playwright"
  - Click **Install**

## First-Time Setup

### 1. Disable Playwright Test Explorer (Optional but Recommended)

When you first open VS Code after installation, you'll see a tip notification:

> 💡 Tip: Disable "Playwright: Show Test Explorer" in settings to hide the test UI in bottom left

**Click "Open Settings"** and uncheck the option to hide the test results UI in the bottom left corner.

### Prerequisites Check

Before starting, ensure you have:
- ✅ Git repository initialized (`git init` if needed)
- ✅ Node.js and npm installed
- ✅ Playwright installed: `npm install -D @playwright/test && npx playwright install`
- ✅ A working dev server command (e.g., `npm run dev`)

### Step 1: Configure User Settings

Open your **User Settings** (not workspace settings):
1. Press `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
2. Click the **"Open Settings (JSON)"** icon in the top right
3. Add your required configuration: e.g.

```json
{
  "visualRegression.environmentVariables": {
    "NEXT_PUBLIC_PLAYWRIGHT": "true"
  },
  "visualRegression.testImportPath": "../fixtures",
  "visualRegression.waitForSelector": "[data-testid='loading-skeleton']"
}
```

**What these settings do:**
- `environmentVariables` - Bypasses authentication during tests
- `testImportPath` - Uses custom test fixtures instead of default Playwright imports.
- `waitForSelector` - Waits for the selector (in the example, loading skeletons to disappear) before taking screenshots

### Step 2: Create a Test Branch

Open the integrated terminal (`Ctrl+\`` or **Terminal → New Terminal**) and run:

```bash
git checkout -b visual-test-demo
```

This creates a new branch for testing visual changes.

### Step 3: Make a Visual Change

Make a small visible change to a page in your application.

Choose any visible change that will be easy to spot in the test report.

### Step 4: Commit the Change

Commit your visual change to the test branch:

```bash
git add .
git commit -m "test: add visual change for regression testing demo"
```

### Step 5: Run Visual Test

Now run the visual regression test to catch your change:

**Option 1: Using Command Palette**
1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: **"Visual Regression: Run Test"**
3. Enter the URL path of the page you modified (e.g., `/` for homepage)

**Option 2: Using Status Bar** ⭐ Recommended
1. Look at the bottom left of VS Code
2. Click the **"Visual Tests"** item in the status bar
3. Select **"Run Test"** from the menu
4. Enter the URL path of the page you modified

### Step 6: Watch the Extension Work

You'll see progress notifications as the extension:
1. ✅ Validates your setup
2. ✅ Switches to `main` branch
3. ✅ Starts server and captures baseline screenshots
4. ✅ Switches back to your `visual-test-demo` branch
5. ✅ Starts server and captures new screenshots
6. ✅ Compares screenshots and detects differences

### Step 7: View the Report

When the test completes, you'll see:
> ⚠️ Visual regression tests failed - differences detected!

**View the report:**

**Option 1: Click notification**
- Click **"Show Report"** in the notification

**Option 2: Use status bar** ⭐ Recommended
1. Click **"Visual Tests"** in the status bar (bottom left)
2. Select **"Show Report"**

The Playwright HTML report will open in your browser showing:
- ✅ Side-by-side comparison of before/after screenshots
- ✅ Highlighted differences in red
- ✅ Exact pixel differences

### Step 8: Clean Up (Optional)

After testing, you can return to your original branch:

```bash
git checkout main
git branch -D visual-test-demo
```

## Running Regular Tests

After the tutorial, use the extension in your normal workflow:

1. **Open Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. **Type**: "Visual Regression: Run Test"
3. **Enter URL path**: Type `/` (or any route like `/unauthorised`)
4. **Watch the progress**: You'll see notifications showing progress

### What Notifications to Expect

During the test run, you'll see progress notifications:

1. ✅ **"Validating setup..."** - Checking prerequisites
2. ✅ **"Switching to main..."** - Checking out main branch
3. ✅ **"Starting server on main branch..."** - Starting your dev server
4. ✅ **"Capturing baseline screenshots..."** - Taking screenshots from main
5. ✅ **"Saving baseline snapshots..."** - Copying snapshots to temp
6. ✅ **"Switching back to [your-branch]..."** - Returning to feature branch
7. ✅ **"Starting server on feature branch..."** - Restarting server
8. ✅ **"Running visual regression tests..."** - Comparing screenshots

### Possible Outcomes

**✅ Success:**
> ✅ Visual regression tests passed!

No visual differences detected between main and your feature branch.

**⚠️ Differences Detected:**
> ⚠️ Visual regression tests failed - differences detected!

Click **"Show Report"** to see a side-by-side comparison of the differences.

**❌ Error:**
> Visual regression test failed: [error message]

Common errors:
- **"Test file not found"** - Create the `pages.spec.ts` file (see step 3)
- **"Playwright is not installed"** - Run `npm install -D @playwright/test && npx playwright install`
- **"Port 3000 is already in use"** - Stop your dev server or change `serverPort` in settings
- **"Not a Git repository"** - Run `git init` in your project

## Viewing Test Results

The extension automatically opens an HTML report in your browser showing:
- Side-by-side comparison of screenshots
- Highlighted differences
- Test execution details

You can also manually open the report:
1. Command Palette: `Cmd+Shift+P` or `Ctrl+Shift+P`
2. Type: "Visual Regression: Show Playwright Report"

## Tips

### Check Detailed Logs

View detailed execution logs:
1. Open Output panel: **View → Output** (or `Cmd+Shift+U`)
2. Select **"Visual Regression Testing"** from dropdown
3. Review command execution and error details

### Port Already in Use

If you see "Port 3000 is already in use":
- **Stop your dev server** before running the test (the extension will start/stop it automatically)
- Or **change the port** in settings: `"visualRegression.serverPort": 3001`

### Server Takes Longer to Start

If your server needs more time to start, increase the timeout:
```json
{
  "visualRegression.serverStartupTime": 10000
}
```

### Testing Multiple Routes

Add more test cases to your `pages.spec.ts`:

```typescript
test('homepage', async ({ page }) => {
  await page.goto(process.env.TEST_URL + '/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('homepage.png', { fullPage: true });
});

test('dashboard', async ({ page }) => {
  await page.goto(process.env.TEST_URL + '/access-denied');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
});
```

## Troubleshooting

### Authentication Loop / Redirects

If you see "ERR_TOO_MANY_REDIRECTS":
1. Verify `NEXT_PUBLIC_PLAYWRIGHT: "true"` is in your settings
2. Check your middleware is checking for this environment variable
3. Make sure the environment variable is available at build/runtime

### Tests Not Finding Visual Differences

This is expected if your changes don't affect visual appearance. The extension compares pixel-by-pixel screenshots.

### Need Help?

- Check the [README.md](README.md) for detailed documentation
- View logs in Output panel: **View → Output → Visual Regression Testing**
- Report issues on [GitHub](https://github.com/hmredmond/visual-regression-testing-vscode-extension/issues)
