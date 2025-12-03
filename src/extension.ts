import * as vscode from "vscode";
import { VisualRegressionController } from "./visualRegressionController";
import { GitService } from "./services/gitService";
import { PlaywrightService } from "./services/playwrightService";
import { ServerService } from "./services/serverService";
import { TestRunner } from "./testRunner";

let controller: VisualRegressionController | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("Visual Regression Testing extension is now active");

  // Check if this workspace has visual regression testing
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  // Show tip about disabling Playwright Test UI on first activation
  const hasShownTip = context.globalState.get<boolean>('hasShownPlaywrightTip', false);
  if (!hasShownTip) {
    vscode.window.showInformationMessage(
      '💡 Tip: Disable "Playwright: Show Test Explorer" in settings to hide the test UI in bottom left',
      'Open Settings',
      'Dismiss'
    ).then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'playwright.showTestExplorer');
      }
    });
    context.globalState.update('hasShownPlaywrightTip', true);
  }

  // Set context for command visibility
  vscode.commands.executeCommand(
    "setContext",
    "workspaceHasVisualRegression",
    true,
  );

  // Initialize controller
  controller = new VisualRegressionController(context, workspaceFolder);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "visualRegression.runTest",
      async () => {
        const config = vscode.workspace.getConfiguration("visualRegression");

        const urlInput = await vscode.window.showInputBox({
          prompt: "Enter URL path(s) to test (comma-separated or one per line, e.g., /access-denied, /unauthorised)",
          value: "/",
          placeHolder: "/path1, /path2 or /path1\n/path2",
        });

        if (!urlInput) {
          return;
        }

        // Parse multiple URLs - support both comma-separated and newline-separated
        const urlPaths = urlInput
          .split(/[,\n]/)
          .map(url => url.trim())
          .filter(url => url.length > 0);

        if (!workspaceFolder) {
          vscode.window.showErrorMessage("No workspace folder open");
          return;
        }

        const gitService = new GitService(workspaceFolder.uri.fsPath);
        const serverService = new ServerService(workspaceFolder.uri.fsPath);
        const playwrightService = new PlaywrightService(
          workspaceFolder.uri.fsPath,
        );

        const testRunner = new TestRunner(
          gitService,
          serverService,
          playwrightService,
          config,
        );

        try {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Running Visual Regression Test",
              cancellable: false,
            },
            async (progress) => {
              await testRunner.runTest(urlPaths, progress);
            },
          );
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[Extension] Full error:', error);
          vscode.window.showErrorMessage(
            `Visual regression test failed: ${errorMsg}`,
          );
        }
      },
    ),
    vscode.commands.registerCommand(
      "visualRegression.runWorkflow",
      async () => {
        await controller?.runWorkflow();
      },
    ),    
    vscode.commands.registerCommand("visualRegression.showReport", async () => {
      await controller?.showReport();
    }),
    
  );

  // Show status bar item
  controller.updateStatusBar("idle");
}

export function deactivate() {
  controller?.dispose();
}
