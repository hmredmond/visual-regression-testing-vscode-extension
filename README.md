# Visual Regression Testing

Automate visual regression testing for your web applications. Compare feature branch changes against main branch baselines automatically.

## Features

- 🎯 **Automatic baseline comparison** - Captures main branch screenshots and compares with your feature branch
- 🔄 **Smart branch switching** - Handles all Git operations automatically
- 🚀 **Zero configuration** - Works with your existing Playwright setup
- 📊 **HTML reports** - Side-by-side comparison of changes
- 🌍 **Environment variables** - Pass custom variables for auth bypass and more
- ⚡ **Multiple URL testing** - Test several routes in one run

## Installation

1. Install from VS Code Marketplace or download the `.vsix` file
2. Ensure Playwright is installed: `npm install -D @playwright/test && npx playwright install`

## Quick Start

### 1. Create Test File

Create `tests/visual/pages.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

// Get URLs from environment (comma-separated for multiple URLs)
const testUrls = process.env.TEST_URLS 
  ? process.env.TEST_URLS.split(',')
  : [process.env.TEST_URL || 'http://localhost:3000/'\]\;

// Generate a test for each URL
for (const testUrl of testUrls) {
  test(\`visual test for \${testUrl}\`, async ({ page }) => {
    await page.goto(testUrl);
    await page.waitForLoadState('networkidle');

    // Generate unique filename from URL path
    const urlPath = new URL(testUrl).pathname;
    const filename = urlPath
      .replace(/^\//, '')
      .replaceAll('/', '-')
      .replaceAll(/[^a-zA-Z0-9-_]/g, '_')
      || 'homepage';

    await expect(page).toHaveScreenshot(\`\${filename}.png\`, { fullPage: true });
  });
}
```

### 2. Configure Settings

Add to `.vscode/settings.json`:

```json
{
  "visualRegression.testPath": "tests/visual/pages.spec.ts",
  "visualRegression.serverStartCommand": "npm run dev",
  "visualRegression.serverPort": 3000,
  "visualRegression.mainBranch": "main",
  "visualRegression.environmentVariables": {
    "NEXT_PUBLIC_PLAYWRIGHT": "true"
  }
}
```

### 3. Run Test

1. Open Command Palette (\`Cmd+Shift+P\`)
2. Type "Visual Regression: Run Test"
3. Enter URL paths (comma-separated for multiple): \`/,/unauthorised,/access-denied\`

## How It Works

1. Clears existing snapshots
2. Switches to main branch and captures baseline screenshots
3. Returns to your feature branch
4. Compares new screenshots against baseline
5. Shows HTML report if differences are found

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| \`testPath\` | \`tests/visual/pages.spec.ts\` | Path to test file |
| \`mainBranch\` | \`main\` | Main branch name |
| \`serverStartCommand\` | \`npm run dev\` | Command to start dev server |
| \`serverPort\` | \`3000\` | Dev server port |
| \`serverStartupTime\` | \`5000\` | Server startup wait time (ms) |
| \`environmentVariables\` | \`{}\` | Custom environment variables |
| \`testImportPath\` | \`@playwright/test\` | Import path for test fixtures |

### Environment Variables

Pass variables to bypass auth or enable mocking:

```json
{
  "visualRegression.environmentVariables": {
    "NEXT_PUBLIC_PLAYWRIGHT": "true",
    "API_MOCKING": "enabled"
  }
}
```

## Auth Bypass Example (Next.js)

In your middleware:

```typescript
export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_PLAYWRIGHT === 'true') {
    return NextResponse.next();
  }
  // Normal auth flow...
}
```

## Troubleshooting

### Test file not found
Create \`tests/visual/pages.spec.ts\` with the template above.

### Playwright not installed
```bash
npm install -D @playwright/test && npx playwright install
```

### Not a Git repository
```bash
git init
```

### Auth redirects
Add environment variables to bypass auth (see Auth Bypass Example above).

### Server timeout
Increase \`serverStartupTime\` in settings (e.g., \`10000\` for 10 seconds).

### Port already in use
Stop your dev server before running tests, or change \`serverPort\` in settings.

### No visual differences detected
Expected if your changes don't affect visual appearance.

### Not seeing notifications
VS Code notifications appear in the bottom right corner. If you missed them:
1. Click the bell icon (🔔) in the bottom right status bar
2. Or check **View → Notifications** to see recent notifications
3. Alternatively, check the Output panel for detailed logs

### Disable Playwright Test UI
1. Open Settings (\`Cmd+,\`)
2. Search "Playwright"
3. Uncheck "Playwright: Show Test Explorer"

### View logs
1. Open Output panel: \`View → Output\`
2. Select "Visual Regression Testing"

## Commands

- **Run Test** - Test one or more URLs
- **Show Playwright Report** - View latest test report

## Requirements

- Node.js 16+
- Git repository
- Playwright (\`@playwright/test\`)
- Dev server command

## Licence

MIT

## Support

[GitHub Issues](https://github.com/hmredmond/visual-regression-testing-vscode-extension/issues)
