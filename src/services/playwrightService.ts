import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

export interface TestResult {
  success: boolean;
  output: string;
}

export class PlaywrightService {
  constructor(private readonly workspaceRoot: string) {}

  async updateSnapshots(urlPath: string, port: number): Promise<void> {
    const config = vscode.workspace.getConfiguration('visualRegression');
    const testPath = config.get<string>('testPath', 'tests/visual/pages.spec.ts');
    const customEnvVars = config.get<Record<string, string>>('environmentVariables', {});
    
    const url = `http://localhost:${port}${urlPath}`;
    const cmd = `npx playwright test ${testPath} --update-snapshots`;
    
    console.log(`[Playwright] Running: ${cmd}`);
    console.log(`[Playwright] TEST_URL=${url}`);
    
    // Log custom environment variables (except sensitive ones)
    for (const key of Object.keys(customEnvVars)) {
      console.log(`[Playwright] ${key}=${customEnvVars[key]}`);
    }
    
    const env = { 
      ...process.env, 
      TEST_URL: url,
      ...customEnvVars
    };
    
    try {
      await execAsync(cmd, {
        cwd: this.workspaceRoot,
        env
      });
      console.log('[Playwright] Baseline snapshots created');
    } catch (error: any) {
      console.log('[Playwright] ❌ Command failed');
      if (error.stdout) console.log('[Playwright stdout]', error.stdout);
      if (error.stderr) console.log('[Playwright stderr]', error.stderr);
      throw new Error(`Playwright test failed: ${error.message}\n${error.stderr || error.stdout || ''}`);
    }
  }

  async runTests(urlPath: string, port: number): Promise<TestResult> {
    const config = vscode.workspace.getConfiguration('visualRegression');
    const testPath = config.get<string>('testPath', 'tests/visual/pages.spec.ts');
    const customEnvVars = config.get<Record<string, string>>('environmentVariables', {});
    
    const url = `http://localhost:${port}${urlPath}`;
    const cmd = `npx playwright test ${testPath} --reporter=html`;
    
    console.log(`[Playwright] Running: ${cmd}`);
    console.log(`[Playwright] TEST_URL=${url}`);
    
    // Log custom environment variables (except sensitive ones)
    for (const key of Object.keys(customEnvVars)) {
      console.log(`[Playwright] ${key}=${customEnvVars[key]}`);
    }
    
    const env = { 
      ...process.env, 
      TEST_URL: url,
      ...customEnvVars
    };
    
    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: this.workspaceRoot,
        env
      });
      
      console.log('[Playwright] Tests passed ✅');
      return {
        success: true,
        output: stdout + stderr
      };
    } catch (error: any) {
      console.log('[Playwright] Tests failed ❌');
      console.log('[Playwright] HTML report generated at playwright-report/');
      return {
        success: false,
        output: error.stdout + error.stderr
      };
    }
  }

  private escapeRegex(str: string): string {
    return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  }
}
