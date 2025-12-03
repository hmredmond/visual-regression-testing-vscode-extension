import { exec, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";

const execAsync = promisify(exec);

interface TestResult {
  success: boolean;
  output: string;
  errorOutput?: string;
}

export class VisualRegressionController {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly outputChannel: vscode.OutputChannel;
  private currentProcess: ChildProcess | null = null;
  private isRunning = false;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
  ) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBarItem.command = "visualRegression.showReport";
    this.statusBarItem.text = "$(beaker) Visual Tests";
    this.statusBarItem.tooltip = "Click to show test report";

    const config = vscode.workspace.getConfiguration("visualRegression");
    if (config.get("showStatusBar")) {
      this.statusBarItem.show();
    }

    context.subscriptions.push(this.statusBarItem);

    // Create output channel
    this.outputChannel = vscode.window.createOutputChannel(
      "Visual Regression Tests",
    );
    context.subscriptions.push(this.outputChannel);
  }

  updateStatusBar(
    state: "idle" | "running" | "success" | "failed",
    message?: string,
  ) {
    switch (state) {
      case "idle":
        this.statusBarItem.text = "$(beaker) Visual Tests";
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.tooltip = "Click to show test report";
        break;
      case "running":
        this.statusBarItem.text = "$(sync~spin) Running Tests...";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
        this.statusBarItem.tooltip = "Visual regression tests in progress";
        break;
      case "success":
        this.statusBarItem.text = "$(check) Tests Passed";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.prominentBackground",
        );
        this.statusBarItem.tooltip = message || "All visual tests passed";
        setTimeout(() => this.updateStatusBar("idle"), 5000);
        break;
      case "failed":
        this.statusBarItem.text = "$(x) Tests Failed";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
        this.statusBarItem.tooltip =
          message || "Visual regression tests detected differences";
        break;
    }
  }

  private async checkGitStatus(): Promise<boolean> {
    try {
      const { stdout } = await execAsync("git status --porcelain", {
        cwd: this.workspaceFolder.uri.fsPath,
      });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync("git branch --show-current", {
        cwd: this.workspaceFolder.uri.fsPath,
      });
      return stdout.trim();
    } catch {
      throw new Error("Could not determine current branch");
    }
  }

  private async runCommand(
    command: string,
    taskName: string,
  ): Promise<TestResult> {
    return new Promise((resolve) => {
      this.outputChannel.clear();
      this.outputChannel.show(true);
      this.outputChannel.appendLine(`🎨 ${taskName}`);
      this.outputChannel.appendLine("=".repeat(60));
      this.outputChannel.appendLine(`Running: ${command}\n`);

      const process = exec(command, {
        cwd: this.workspaceFolder.uri.fsPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      this.currentProcess = process;
      let output = "";
      let errorOutput = "";

      process.stdout?.on("data", (data: Buffer) => {
        const text = data.toString();
        output += text;
        this.outputChannel.append(text);
      });

      process.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;
        this.outputChannel.append(text);
      });

      process.on("close", (code) => {
        this.currentProcess = null;
        const success = code === 0;

        this.outputChannel.appendLine("\n" + "=".repeat(60));
        this.outputChannel.appendLine(
          success
            ? "✅ Command completed successfully"
            : `❌ Command failed with exit code ${code}`,
        );

        resolve({ success, output, errorOutput });
      });

      process.on("error", (error) => {
        this.currentProcess = null;
        this.outputChannel.appendLine(`\n❌ Error: ${error.message}`);
        resolve({ success: false, output, errorOutput: error.message });
      });
    });
  }

  async runWorkflow(mode?: "full" | "changed" | "single", page?: string) {
    if (this.isRunning) {
      vscode.window.showWarningMessage(
        "Visual regression tests are already running",
      );
      return;
    }

    try {
      this.isRunning = true;
      this.updateStatusBar("running");

      // Check current branch
      const currentBranch = await this.getCurrentBranch();
      if (currentBranch === "main") {
        const proceed = await vscode.window.showWarningMessage(
          "You are on the main branch. This workflow is designed for feature branches.",
          "Continue Anyway",
          "Cancel",
        );
        if (proceed !== "Continue Anyway") {
          this.updateStatusBar("idle");
          return;
        }
      }

      // Check for uncommitted changes
      const hasChanges = await this.checkGitStatus();
      if (hasChanges) {
        const proceed = await vscode.window.showWarningMessage(
          "You have uncommitted changes. It's recommended to commit or stash them first.",
          "Continue Anyway",
          "Cancel",
        );
        if (proceed !== "Continue Anyway") {
          this.updateStatusBar("idle");
          return;
        }
      }

      // Build command
      let command = "npm run test:playwright:visual:workflow";
      if (mode === "changed") {
        command += " -- --changed";
      } else if (mode === "single" && page) {
        command += ` -- --page ${page}`;
      }

      // Run the workflow
      const result = await this.runCommand(
        command,
        "Visual Regression Workflow",
      );

      if (result.success) {
        this.updateStatusBar("success", "All visual tests passed!");
        const config = vscode.workspace.getConfiguration("visualRegression");
        if (config.get("notifyOnCompletion")) {
          const action = await vscode.window.showInformationMessage(
            "✅ Visual regression tests passed!",
            "Show Report",
          );
          if (action === "Show Report") {
            await this.showReport();
          }
        }
      } else {
        this.updateStatusBar(
          "failed",
          "Visual differences detected - click to view report",
        );
        const action = await vscode.window.showErrorMessage(
          "❌ Visual regression tests detected differences",
          "Show Report",
          "Dismiss",
        );
        if (action === "Show Report") {
          await this.showReport();
        }
      }
    } catch (error) {
      this.updateStatusBar("failed");
      vscode.window.showErrorMessage(
        `Failed to run visual regression tests: ${error}`,
      );
    } finally {
      this.isRunning = false;
    }
  }

  async runChangedPages() {
    await this.runWorkflow("changed");
  }

  async runSinglePage() {
    const page = await vscode.window.showInputBox({
      prompt: "Enter the page path to test (e.g., /enquiries)",
      placeHolder: "/",
      validateInput: (value) => {
        if (!value?.startsWith("/")) {
          return "Page path must start with /";
        }
        return null;
      },
    });

    if (page) {
      await this.runWorkflow("single", page);
    }
  }

  async updateBaselines() {
    const currentBranch = await this.getCurrentBranch();
    if (currentBranch !== "main") {
      const proceed = await vscode.window.showWarningMessage(
        "You should update baselines from the main branch. Switch to main first?",
        "Switch to Main",
        "Cancel",
      );
      if (proceed !== "Switch to Main") {
        return;
      }

      try {
        await execAsync("git checkout main", {
          cwd: this.workspaceFolder.uri.fsPath,
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to switch to main: ${error}`);
        return;
      }
    }

    this.updateStatusBar("running");
    const result = await this.runCommand(
      "npm run test:playwright:visual -- --update",
      "Update Visual Regression Baselines",
    );

    if (result.success) {
      this.updateStatusBar("success", "Baselines updated successfully!");
      vscode.window.showInformationMessage(
        "✅ Visual regression baselines updated on main branch",
      );
    } else {
      this.updateStatusBar("failed");
      vscode.window.showErrorMessage("Failed to update baselines");
    }
  }

  async showReport() {
    try {
      // Try to open the report
      await execAsync("npx playwright show-report", {
        cwd: this.workspaceFolder.uri.fsPath,
      });
    } catch (error) {
      // Check if it's a port already in use error
      const errorMessage = String(error);
      if (errorMessage.includes("EADDRINUSE")) {
        const action = await vscode.window.showWarningMessage(
          "Playwright report server is already running on another port. Kill existing server and restart?",
          "Kill & Restart",
          "Open in Browser",
          "Cancel",
        );

        if (action === "Kill & Restart") {
          try {
            // Kill any existing playwright report servers
            await execAsync("pkill -f 'playwright show-report' || true", {
              cwd: this.workspaceFolder.uri.fsPath,
            });
            // Wait a moment for the port to be released
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Try again
            await execAsync("npx playwright show-report", {
              cwd: this.workspaceFolder.uri.fsPath,
            });
          } catch (retryError) {
            vscode.window.showErrorMessage(
              `Failed to restart Playwright report: ${retryError}`,
            );
          }
        } else if (action === "Open in Browser") {
          // Open the default port in browser
          await vscode.env.openExternal(
            vscode.Uri.parse("http://localhost:9323"),
          );
        }
      } else {
        vscode.window.showErrorMessage(
          `Could not open Playwright report: ${error}`,
        );
      }
    }
  }

  async cleanSnapshots() {
    const proceed = await vscode.window.showWarningMessage(
      "This will delete all visual regression snapshots. Continue?",
      { modal: true },
      "Delete Snapshots",
    );

    if (proceed === "Delete Snapshots") {
      const result = await this.runCommand(
        "rm -rf tests/visual/*.spec.ts-snapshots",
        "Clean Visual Regression Snapshots",
      );

      if (result.success) {
        vscode.window.showInformationMessage(
          "✅ Visual regression snapshots cleaned",
        );
      } else {
        vscode.window.showErrorMessage("Failed to clean snapshots");
      }
    }
  }

  dispose() {
    if (this.currentProcess) {
      this.currentProcess.kill();
    }
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
  }
}
