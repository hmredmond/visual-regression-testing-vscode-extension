# Visual Regression Testing

Automate visual regression testing for your web applications with seamless Playwright integration. Compare feature branch changes against main branch baselines automatically.

## Features

- 🎯 **Automatic Baseline Comparison** - Captures main branch screenshots and compares them with your feature branch
- 🔄 **Smart Branch Switching** - Automatically switches to main, captures baselines, and returns to your feature branch
- 🚀 **Zero Configuration** - Works with your existing Playwright setup
- 📊 **HTML Reports** - Beautiful side-by-side comparison reports
- 🌍 **Environment Variable Support** - Pass custom environment variables for authentication bypass and more
- ⚡ **Quick URL Testing** - Test any route with a simple input prompt

## Installation

1. Install the extension from the VS Code Marketplace
2. Open your project in VS Code
3. Ensure Playwright is installed: `npm install -D @playwright/test`
4. Create a visual regression test file (see Setup below)

## Setup

### 1. Create Test File

Create a `pages.spec.ts` file in your project (recommended location: `tests/visual/pages.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';

test('visual test for homepage', async ({ page }) => {
  const testUrl = process.env.TEST_URL || 'http://localhost:3000/';
  
  // Authentication bypass is handled via environment variables
  // configured in VS Code settings (e.g., NEXT_PUBLIC_PLAYWRIGHT=true)
  
  await page.goto(testUrl);
  
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Capture full page screenshot (including below the fold)
  await expect(page).toHaveScreenshot('homepage.png', { fullPage: true });
});
```

**Important:** 
- The test file must be named `pages.spec.ts` and use the `TEST_URL` environment variable as shown above
- Use `{ fullPage: true }` to capture the entire page including content below the fold

### 2. Configure VS Code Settings

Add these settings to your workspace `.vscode/settings.json`:

```json
{
  "visualRegression.testPath": "tests/visual/pages.spec.ts",
  "visualRegression.serverStartCommand": "npm run dev",
  "visualRegression.serverPort": 3000,
  "visualRegression.serverStartupTime": 5000,
  "visualRegression.mainBranch": "main",
  "visualRegression.environmentVariables": {
    "NEXT_PUBLIC_PLAYWRIGHT": "true"
  }
}
```

### 3. Install Playwright Browsers

If you haven't already:

```bash
npx playwright install
```

## Usage

### Run Visual Regression Test

1. Open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Type "Visual Regression: Run Test"
3. Enter the URL path to test (e.g., `/` or `/dashboard`)

The extension will:
1. Switch to your main branch
2. Start the dev server and capture baseline screenshots
3. Switch back to your feature branch
4. Capture new screenshots and compare them
5. Show an HTML report with any differences

## How It Works

1. **Saves your current branch** - Remembers where you were
2. **Switches to main** - Checks out your main/master branch
3. **Captures baseline** - Takes screenshots from the stable branch
4. **Returns to feature branch** - Switches back to your working branch
5. **Compares screenshots** - Runs Playwright tests against the baseline
6. **Shows report** - Opens interactive HTML report if differences are found

All snapshots are temporary and never committed to Git.

## Configuration

All settings can be configured in `.vscode/settings.json`:

| Setting | Default | Description |
|---------|---------|-------------|
| `visualRegression.testPath` | `"tests/visual/pages.spec.ts"` | Path to your visual test file (must be named `pages.spec.ts`) |
| `visualRegression.mainBranch` | `"main"` | Main branch name for baseline comparison |
| `visualRegression.serverStartCommand` | `"npm run dev"` | Command to start your dev server |
| `visualRegression.serverPort` | `3000` | Port your dev server runs on |
| `visualRegression.serverStartupTime` | `5000` | Time to wait for server startup (milliseconds) |
| `visualRegression.environmentVariables` | `{}` | Custom environment variables passed to server and tests |

### Environment Variables

The `environmentVariables` setting is useful for authentication bypass in tests:

```json
{
  "visualRegression.environmentVariables": {
    "NEXT_PUBLIC_PLAYWRIGHT": "true",
    "API_MOCKING": "enabled"
  }
}
```

These variables are passed to:
- Your dev server when it starts
- Playwright tests during execution

Common use cases:
- **Next.js Auth Bypass**: `NEXT_PUBLIC_PLAYWRIGHT: "true"`
- **API Mocking**: Enable MSW or similar mocking tools
- **Feature Flags**: Enable/disable features for testing

## Requirements

- **Node.js** - Version 16 or higher
- **Git** - Must be a git repository
- **Playwright** - `@playwright/test` installed in your project
- **Test File** - A `pages.spec.ts` file in your project (see Setup above)
- **Dev Server** - A command to start your application locally

## Troubleshooting

### "Test file not found"

**Solution:** Create a `pages.spec.ts` file in your project. The extension looks for a file with this exact name. See the Setup section above for the required file format.

### "Playwright is not installed"

**Solution:** Install Playwright and its browsers:
```bash
npm install -D @playwright/test
npx playwright install
```

### "Not a Git repository"

**Solution:** Initialize git in your project:
```bash
git init
```

### Tests stuck on authentication/login screen

**Solutions:**
1. Add environment variables to bypass authentication (recommended):
   ```json
   {
     "visualRegression.environmentVariables": {
       "NEXT_PUBLIC_PLAYWRIGHT": "true"
     }
   }
   ```
2. Ensure your middleware checks for the environment variable
3. Use MSW or similar tools to mock authentication APIs

### Server not starting or timing out

**Solutions:**
- Increase `serverStartupTime` in settings (try 10000 for 10 seconds)
- Verify `serverStartCommand` is correct for your project
- Check `serverPort` matches your dev server's port
- Ensure no other process is using the port

### Tests pass but no visual differences detected

**Solution:** This is expected if your changes don't affect visual appearance. The extension compares pixel-by-pixel screenshots.

### Disable Playwright Test UI in bottom status bar

If you see test results/warnings in the bottom left from the Playwright extension:

**Option 1 - Disable Playwright Test UI:**
1. Open Settings (`Cmd+,`)
2. Search for "Playwright"
3. Uncheck "Playwright: Show Test Explorer"

**Option 2 - Hide Testing View:**
1. Right-click the Testing icon in the Activity Bar
2. Select "Hide"

This extension runs Playwright independently and doesn't need the built-in test UI.

### Check detailed logs

View detailed execution logs:
1. Open Output panel: `View → Output`
2. Select "Visual Regression Testing" from dropdown
3. Review command execution and error details

## Examples

### Testing Multiple Routes

Create additional test cases in your `pages.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

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

test('settings', async ({ page }) => {
  await page.goto(process.env.TEST_URL + '/settings');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('settings.png', { fullPage: true });
});
```

### Next.js with Auth0 Bypass

In your middleware:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Bypass auth in Playwright tests
  if (process.env.NEXT_PUBLIC_PLAYWRIGHT === 'true') {
    return NextResponse.next();
  }
  
  // Normal auth flow
  // ...
}
```

In VS Code settings:

```json
{
  "visualRegression.environmentVariables": {
    "NEXT_PUBLIC_PLAYWRIGHT": "true"
  }
}
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

MIT

## Support

For issues, feature requests, or questions, please visit the [GitHub repository](https://github.com/yourusername/visual-regression-testing-extension).

```bash
npm run package
```

## Commands Reference

All commands are available via Command Palette (⌘+Shift+P):

```
Visual Regression: Run Visual Regression Workflow
Visual Regression: Test Changed Pages Only
Visual Regression: Test Single Page
Visual Regression: Update Baselines (Main Branch)
Visual Regression: Show Playwright Report
Visual Regression: Clean Snapshots
```

## Contributing

This extension is part of the Sales Hub project's visual regression testing infrastructure.

## License

Private - Keyloop Internal Use Only

## Support

For issues or questions, contact the platform team.

---

**Enjoy seamless visual regression testing!** 🎨✨
