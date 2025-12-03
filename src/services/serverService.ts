import { exec, ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

export class ServerService {
  private serverProcess: ChildProcess | null = null;

  constructor(private readonly workspaceRoot: string) {}

  private async isPortInUse(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      return stdout.trim().length > 0;
    } catch {
      // lsof returns non-zero exit code if port is free
      return false;
    }
  }

  async start(): Promise<void> {
    const config = vscode.workspace.getConfiguration('visualRegression');
    const startCommand = config.get<string>('serverStartCommand', 'npm run dev');
    const serverPort = config.get<number>('serverPort', 3000);
    const customEnvVars = config.get<Record<string, string>>('environmentVariables', {});

    // Check if port is already in use
    const portInUse = await this.isPortInUse(serverPort);
    if (portInUse) {
      throw new Error(
        `Port ${serverPort} is already in use. Please stop the process using this port or configure a different port in settings (visualRegression.serverPort).`
      );
    }

    if (this.serverProcess) {
      await this.stop();
    }

    // Pass environment variables to the server (critical for NEXT_PUBLIC_* vars)
    const env = { 
      ...process.env,
      ...customEnvVars
    };

    console.log('[Server] Starting with environment variables:', Object.keys(customEnvVars));

    this.serverProcess = exec(startCommand, {
      cwd: this.workspaceRoot,
      env
    });

    // Log server output for debugging
    this.serverProcess.stdout?.on('data', (data) => {
      console.log(`Server: ${data}`);
    });

    this.serverProcess.stderr?.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });
  }

  async stop(): Promise<void> {
    if (!this.serverProcess) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.serverProcess) {
        resolve();
        return;
      }

      this.serverProcess.on('exit', () => {
        this.serverProcess = null;
        resolve();
      });

      // Kill the process and its children
      if (this.serverProcess.pid) {
        try {
          process.kill(-this.serverProcess.pid);
        } catch {
          // Process might already be dead - ignore error
          this.serverProcess.kill();
        }
      }
    });
  }
}
