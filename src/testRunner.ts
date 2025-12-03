import * as vscode from 'vscode';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { GitService } from './services/gitService';
import { PlaywrightService } from './services/playwrightService';
import { ServerService } from './services/serverService';

const execAsync = promisify(exec);

export class TestRunner {
  private readonly outputChannel: vscode.OutputChannel;

  constructor(
    private readonly gitService: GitService,
    private readonly serverService: ServerService,
    private readonly playwrightService: PlaywrightService,
    private readonly config: vscode.WorkspaceConfiguration
  ) {
    this.outputChannel = vscode.window.createOutputChannel('Visual Regression Test');
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  private colorBranch(branchName: string, isMainBranch: boolean): string {
    // Add descriptive label for clarity
    const label = isMainBranch ? '[BASE]' : '[FEATURE]';
    return `${label} '${branchName}'`;
  }

  async runTest(
    urlPaths: string[],
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    const mainBranch = this.config.get<string>('mainBranch', 'main');
    const serverPort = this.config.get<number>('serverPort', 3000);
    const startupTime = this.config.get<number>('serverStartupTime', 5000);
    const testPath = this.config.get<string>('testPath', 'tests/visual');

    // Show output channel
    this.outputChannel.clear();
    this.outputChannel.show(true);
    this.log('🎨 Starting Visual Regression Test');
    this.log('='.repeat(60));
    this.log(`Testing ${urlPaths.length} URL(s): ${urlPaths.join(', ')}`);

    // Validate prerequisites
    progress.report({ message: 'Validating setup...', increment: 5 });
    try {
      await this.validateSetup(testPath);
    } catch (error) {
      this.log(`❌ Setup validation failed: ${error}`);
      throw error;
    }

    // Save current branch
    progress.report({ message: 'Checking current branch...', increment: 10 });
    this.log('📍 Getting current branch...');
    const originalBranch = await this.gitService.getCurrentBranch();
    this.log(`Current branch: ${this.colorBranch(originalBranch, false)}`);
    
    // Clear any existing snapshots before starting
    this.log('🧹 Clearing existing snapshots...');
    await this.gitService.clearSnapshots();
    
    let tmpDir = '';
    try {
      // Switch to main branch
      progress.report({ message: `Switching to ${mainBranch}...`, increment: 10 });
      this.log(`🔄 Switching to ${this.colorBranch(mainBranch, true)} branch...`);
      await this.gitService.checkout(mainBranch);

      // Start server and capture baseline
      progress.report({ message: 'Starting server on main branch...', increment: 10 });
      this.log(`🚀 Starting dev server on port ${serverPort}...`);
      await this.serverService.start();
      this.log(`⏳ Waiting ${startupTime}ms for server startup...`);
      await this.wait(startupTime);

      progress.report({ message: 'Capturing baseline screenshots...', increment: 20 });
      this.log(`📸 Capturing baseline screenshots from main branch for ${urlPaths.length} URL(s)...`);
      for (const urlPath of urlPaths) {
        this.log(`  - ${urlPath}`);
      }
      await this.playwrightService.updateAllSnapshots(urlPaths, serverPort);

      // Copy the baseline snapshots to temp directory
      progress.report({ message: 'Saving baseline snapshots...', increment: 5 });
      this.log('💾 Saving baseline snapshots to temp directory...');
      tmpDir = await this.gitService.saveSnapshotsToTemp();

      // Stop server
      this.log('🛑 Stopping server...');
      await this.serverService.stop();

      // Switch back to original branch
      progress.report({ message: `Switching back to ${originalBranch}...`, increment: 10 });
      this.log(`🔄 Switching back to ${this.colorBranch(originalBranch, false)}...`);
      await this.gitService.checkout(originalBranch);

      // Restore baseline snapshots from temp (overwrite feature branch snapshots)
      this.log('📦 Restoring baseline snapshots (from main) to compare against...');
      await this.gitService.restoreSnapshotsFromTemp(tmpDir);

      // Start server and run comparison tests
      progress.report({ message: 'Starting server on feature branch...', increment: 10 });
      this.log(`🚀 Starting dev server on ${this.colorBranch(originalBranch, false)}...`);
      await this.serverService.start();
      this.log(`⏳ Waiting ${startupTime}ms for server startup...`);
      await this.wait(startupTime);

      progress.report({ message: 'Running visual regression tests...', increment: 20 });
      this.log(`🧪 Running visual regression tests against baseline for ${urlPaths.length} URL(s)...`);

      // Run all tests together so the report includes all URLs
      const result = await this.playwrightService.runAllTests(urlPaths, serverPort);

      // Stop server
      await this.serverService.stop();

      // Show results
      if (result.success) {
        vscode.window.showInformationMessage(
          `✅ Visual regression tests passed for all ${urlPaths.length} URL(s)!`
        );
      } else {
        this.log('');
        this.log('📊 Test Results: Differences detected');
        this.log(`  Tested ${urlPaths.length} URL(s)`);
        for (const url of urlPaths) {
          this.log(`     - ${url}`);
        }

        const action = await vscode.window.showWarningMessage(
          `⚠️ Visual regression tests failed - differences detected!`,
          'Show Report',
          'Dismiss'
        );
        if (action === 'Show Report') {
          await this.showHtmlReport();
        }
      }

    } catch (error) {
      // Ensure we're back on original branch and server is stopped
      this.log('❌ Test failed - cleaning up...');
      await this.serverService.stop();
      await this.serverService.killPort(serverPort);
      try {
        await this.gitService.checkout(originalBranch);
      } catch (checkoutError) {
        // Log but don't throw - we want to show the original error
        console.error('Failed to switch back to original branch:', checkoutError);
      }
      throw error;
    } finally {
      // Cleanup temp directory if it exists
      if (tmpDir) {
        this.log('🧹 Cleaning up temp directory...');
        await this.gitService.cleanupTemp(tmpDir);
      }
      this.log('✨ Test run complete');
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async validateSetup(testPath: string): Promise<void> {
    const workspaceRoot = this.gitService['workspaceRoot'];
    const fs = require('node:fs');
    const path = require('node:path');

    // Check if Playwright is installed
    this.log('✓ Checking for Playwright installation...');
    try {
      await execAsync('npx playwright --version', {
        cwd: workspaceRoot
      });
      this.log('✓ Playwright is installed');
    } catch (_error) {
      const message = 'Playwright is not installed. Please run: npm install -D @playwright/test && npx playwright install';
      this.log(`✗ ${message}`);
      throw new Error(message);
    }

    // Check if test file/directory exists
    this.log(`✓ Checking for test file: ${testPath}...`);
    const testFile = path.join(workspaceRoot, testPath);
    
    // Check if it's a directory or file
    let isDirectory = false;
    let testFileExists = false;
    
    if (fs.existsSync(testFile)) {
      const stats = fs.statSync(testFile);
      isDirectory = stats.isDirectory();
      testFileExists = true;
    } else {
      // Check if path ends with a file extension
      isDirectory = !testPath.endsWith('.ts') && !testPath.endsWith('.js');
    }

    if (isDirectory) {
      // Ensure directory exists
      if (!testFileExists) {
        this.log(`📁 Creating directory: ${testPath}`);
        fs.mkdirSync(testFile, { recursive: true });
      }
      
      // Check for test files
      const files = fs.readdirSync(testFile);
      const testFiles = files.filter((f: string) => f.endsWith('.spec.ts') || f.endsWith('.spec.js'));
      
      if (testFiles.length === 0) {
        this.log(`⚠️  No test files found in ${testPath}`);
        
        // Offer to create a template test file
        const action = await vscode.window.showWarningMessage(
          `No test files found in ${testPath}. Would you like to create a template test file?`,
          'Create Template',
          'Cancel'
        );
        
        if (action === 'Create Template') {
          await this.createTemplateTestFile(testFile, testPath);
          this.log(`✓ Created template test file in ${testPath}`);
        } else {
          throw new Error('No test files found. Please add test files to continue.');
        }
      } else {
        this.log(`✓ Found ${testFiles.length} test file(s)`);
      }
    } else if (testFileExists) {
      this.log(`✓ Test file exists: ${testPath}`);
    } else {
      // File doesn't exist - create it
      this.log(`⚠️  Test file not found: ${testPath}`);
      
      // Create parent directory if needed
      const parentDir = path.dirname(testFile);
      if (!fs.existsSync(parentDir)) {
        this.log(`📁 Creating directory: ${path.dirname(testPath)}`);
        fs.mkdirSync(parentDir, { recursive: true });
      }
      
      const action = await vscode.window.showWarningMessage(
        `Test file not found: ${testPath}. Would you like to create a template test file?`,
        'Create Template',
        'Cancel'
      );
      
      if (action === 'Create Template') {
        await this.createTemplateTestFile(parentDir, path.dirname(testPath));
        this.log(`✓ Created template test file at ${testPath}`);
      } else {
        throw new Error('Test file not found. Please create the test file to continue.');
      }
    }

    // Check if it's a git repository
    this.log('✓ Checking Git repository...');
    try {
      await execAsync('git rev-parse --git-dir', {
        cwd: workspaceRoot
      });
      this.log('✓ Git repository detected');
    } catch (_error) {
      const message = 'Not a Git repository. Please initialize git: git init';
      this.log(`✗ ${message}`);
      throw new Error(message);
    }

    this.log('✅ All prerequisites validated');
  }

  private async createTemplateTestFile(testDir: string, testPath: string): Promise<void> {
    const fs = require('node:fs');
    const path = require('node:path');

    const importPath = this.config.get<string>('testImportPath', '@playwright/test');
    const waitForSelector = this.config.get<string>('waitForSelector', '');

    // Generate the wait logic based on whether a selector is configured
    const waitLogic = waitForSelector
      ? `
  // Wait for loading indicator to disappear (if configured)
  await page.waitForFunction(() => {
    const noLoading = !document.querySelector("${waitForSelector}");
    return document.readyState === 'complete' && noLoading;
  });`
      : `
  // Wait for the page to be fully loaded
  await page.waitForLoadState('networkidle');`;

    const templateContent = `import { test, expect } from '${importPath}';

// Authentication bypass is handled via environment variables
// Example: NEXT_PUBLIC_PLAYWRIGHT=true to bypass Auth0
// Configure in VS Code settings: visualRegression.environmentVariables

// Get URLs from environment variable (comma-separated for multiple URLs)
const testUrls = process.env.TEST_URLS 
  ? process.env.TEST_URLS.split(',')
  : [process.env.TEST_URL || 'http://localhost:3000/'];

// Generate a test for each URL
for (const testUrl of testUrls) {
  test(\`visual test for \${testUrl}\`, async ({ page }) => {
    await page.goto(testUrl);
${waitLogic}

    // Generate unique filename from URL path
    const urlPath = new URL(testUrl).pathname;
    const filename = urlPath
      .replace(/^\\//, '') // Remove leading slash
      .replace(/\\//g, '-') // Replace slashes with hyphens
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars with underscores
      || 'homepage'; // Default name for root path

    await expect(page).toHaveScreenshot(\`\${filename}.png\`, { fullPage: true });
  });
}
`;

    const filePath = path.join(testDir, 'pages.spec.ts');
    fs.writeFileSync(filePath, templateContent, 'utf8');
    
    // Also create playwright.config.ts if it doesn't exist
    const workspaceRoot = this.gitService['workspaceRoot'];
    const configPath = path.join(workspaceRoot, 'playwright.config.ts');
    
    if (!fs.existsSync(configPath)) {
      const configContent = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './${testPath}',
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
  },
});
`;
      fs.writeFileSync(configPath, configContent, 'utf8');
      this.log('✓ Created playwright.config.ts');
    }
    
    vscode.window.showInformationMessage(
      `Created template test file: ${testPath}/pages.spec.ts`
    );
  }

  private async showHtmlReport(): Promise<void> {
    try {
      const workspaceRoot = this.gitService['workspaceRoot'];
      
      // Kill any existing report servers on port 9323
      this.log('🔍 Checking for existing report server...');
      try {
        await execAsync('lsof -ti:9323 | xargs kill -9 2>/dev/null || true', {
          cwd: workspaceRoot
        });
        this.log('🧹 Cleaned up existing report server');
        await this.wait(500);
      } catch {
        // No existing server, that's fine
      }

      this.log('🌐 Opening Playwright HTML report...');
      
      // Run in background - don't await
      const { exec } = require('node:child_process');
      const reportProcess = exec('npx playwright show-report', {
        cwd: workspaceRoot,
        detached: true
      });

      reportProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          this.log(`[Report] ${output}`);
        }
      });

      reportProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output && !output.includes('EADDRINUSE')) {
          this.log(`[Report Error] ${output}`);
        }
      });

      // Give it a moment to start, then open browser
      await this.wait(1500);
      await vscode.env.openExternal(vscode.Uri.parse('http://localhost:9323'));
      
      this.log('✅ Report opened in browser at http://localhost:9323');
      vscode.window.showInformationMessage('📊 Visual regression report opened in browser');
    } catch (error) {
      this.log(`❌ Failed to open HTML report: ${error}`);
      vscode.window.showErrorMessage(`Failed to open report: ${error}`);
    }
  }
}
