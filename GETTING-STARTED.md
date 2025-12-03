# Getting Started with Visual Regression Testing Extension

## Installation

1. Download the `visual-regression-testing-with-playwright-1.0.0.vsix` file
2. Open VS Code
3. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
4. Type "Install from VSIX" and select **Extensions: Install from VSIX...**
5. Select the downloaded `.vsix` file
6. Click "Reload" when prompted to activate the extension

## First-Time Setup

### 1. Disable Playwright Test Explorer (Optional but Recommended)

When you first open VS Code after installation, you'll see a tip notification:

> 💡 Tip: Disable "Playwright: Show Test Explorer" in settings to hide the test UI in bottom left

**Click "Open Settings"** and uncheck the option to hide the test results UI in the bottom left corner.

### 2. Configure Extension Settings

Open your workspace settings file (`.vscode/settings.json`):

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Preferences: Open Workspace Settings (JSON)"
3. Add the following configuration:

```json
{
  "visualRegression.testPath": "tests/visual/pages.spec.ts",
  "visualRegression.serverStartCommand": "npm run dev",
  "visualRegression.serverPort": 3000,
  "visualRegression.serverStartupTime": 5000,
  "visualRegression.mainBranch": "main",
  "visualRegression.environmentVariables": {
    "NEXT_PUBLIC_PLAYWRIGHT": "true"
  },
  "visualRegression.testImportPath": "../fixtures"
}
```

**Configuration Explained:**

- `testPath` - Location of your test file (we'll create this next)
- `serverStartCommand` - Command to start your dev server
- `serverPort` - Port your dev server runs on
- `serverStartupTime` - How long to wait for server to start (in milliseconds)
- `mainBranch` - Your main/master branch name
- `environmentVariables` - Custom environment variables passed to your server and tests
  - `NEXT_PUBLIC_PLAYWRIGHT: "true"` - Tells your app to bypass authentication in tests
- `testImportPath` - Path to your test fixtures (use `"../fixtures"` if you have custom fixtures, or `"@playwright/test"` for default Playwright)

### 3. Create Test File

Create a test file at `tests/visual/pages.spec.ts`:

```bash
mkdir -p tests/visual
```

Then create `tests/visual/pages.spec.ts` with this content:

```typescript
import { expect, test } from "../fixtures";

test("visual test for homepage", async ({ page }) => {
  const testUrl = process.env.TEST_URL || "http://localhost:3000/";

  // Authentication bypass is handled via environment variables
  // configured in VS Code settings (e.g., NEXT_PUBLIC_PLAYWRIGHT=true)

  await page.goto(testUrl);

  // Wait for the page to be fully loaded
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot("homepage.png", { fullPage: true });
});
```

**Or use the provided script:**

```bash
./create-test-file.sh tests/visual "../fixtures"
```

### 4. Ensure Your Middleware Checks the Environment Variable

In your Next.js middleware or authentication handler:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Bypass auth in Playwright tests
  if (process.env.NEXT_PUBLIC_PLAYWRIGHT === 'true') {
    return NextResponse.next();
  }
  
  // Normal authentication flow
  // ...
}
```

## Running Your First Test

1. **Open Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. **Type**: "Visual Regression: Run Test"
3. **Enter URL path**: Type `/` (or any route like `/dashboard`)
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
  await page.goto(process.env.TEST_URL + '/dashboard');
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
