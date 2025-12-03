import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class GitService {
  constructor(private readonly workspaceRoot: string) {}

  async getCurrentBranch(): Promise<string> {
    console.log('[Git] Running: git branch --show-current');
    const { stdout } = await execAsync('git branch --show-current', {
      cwd: this.workspaceRoot
    });
    console.log(`[Git] Current branch: ${stdout.trim()}`);
    return stdout.trim();
  }

  async checkout(branch: string): Promise<void> {
    // Clean untracked files that might block checkout (like test-results)
    try {
      console.log('[Git] Running: git clean -fd test-results/ playwright-report/');
      await execAsync('git clean -fd test-results/ playwright-report/', {
        cwd: this.workspaceRoot
      });
    } catch {
      // Ignore if directories don't exist
    }
    
    console.log(`[Git] Running: git checkout -f ${branch}`);
    await execAsync(`git checkout -f ${branch}`, {
      cwd: this.workspaceRoot
    });
    console.log(`[Git] Checked out ${branch}`);
  }

  async clearSnapshots(): Promise<void> {
    try {
      console.log('[Git] Clearing existing snapshots');
      await execAsync('rm -rf tests/visual/*.spec.ts-snapshots', {
        cwd: this.workspaceRoot
      });
      console.log('[Git] Snapshots cleared');
    } catch (error) {
      console.error('[Git] Failed to clear snapshots:', error);
    }
  }

  async saveSnapshotsToTemp(): Promise<string> {
    const tmpDir = `/tmp/visual-regression-baseline-${Date.now()}`;
    try {
      console.log(`[Git] Copying snapshots to ${tmpDir}`);
      await execAsync(`mkdir -p ${tmpDir} && cp -r tests/visual/*.spec.ts-snapshots ${tmpDir}/ 2>/dev/null || true`, {
        cwd: this.workspaceRoot
      });
      console.log('[Git] Baseline snapshots saved to temp');
      return tmpDir;
    } catch (error) {
      console.error('[Git] Failed to save snapshots:', error);
      return tmpDir;
    }
  }

  async restoreSnapshotsFromTemp(tmpDir: string): Promise<void> {
    try {
      console.log(`[Git] Restoring snapshots from ${tmpDir}`);
      await execAsync(`rm -rf tests/visual/*.spec.ts-snapshots && cp -r ${tmpDir}/*.spec.ts-snapshots tests/visual/ 2>/dev/null || true`, {
        cwd: this.workspaceRoot
      });
      console.log('[Git] Baseline snapshots restored');
    } catch (error) {
      console.error('[Git] Failed to restore snapshots:', error);
    }
  }

  async cleanupTemp(tmpDir: string): Promise<void> {
    try {
      console.log(`[Git] Cleaning up ${tmpDir}`);
      await execAsync(`rm -rf ${tmpDir}`, {
        cwd: this.workspaceRoot
      });
    } catch (error) {
      console.error('[Git] Failed to cleanup temp:', error);
    }
  }

  async stageFiles(path: string): Promise<void> {
    try {
      console.log(`[Git] Staging files: ${path}`);
      await execAsync(`git add ${path}`, {
        cwd: this.workspaceRoot
      });
      console.log('[Git] Files staged');
    } catch (error) {
      console.error('[Git] Failed to stage files:', error);
    }
  }
}
