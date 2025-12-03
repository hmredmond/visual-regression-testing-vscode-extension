# Change Log

All notable changes to the "Visual Regression Testing" extension will be documented in this file.

## [1.0.0] - 2024-12-02

### Added
- Initial release
- Automatic main branch baseline comparison
- Smart branch switching (main → feature → restore)
- Environment variable support for authentication bypass
- HTML report generation with side-by-side comparisons
- Real-time output logging
- Git repository validation
- Playwright installation validation
- Configurable dev server management
- Temporary snapshot isolation (no git commits needed)

### Features
- **Run Visual Regression Test** - Compare feature branch against main baseline
- **Environment Variables** - Pass custom env vars to server and tests
- **Automatic Cleanup** - Temporary snapshots are automatically cleaned up
- **Progress Notifications** - Visual feedback during test execution
- **HTML Reports** - Interactive comparison reports

### Configuration
- `visualRegression.testPath` - Path to your pages.spec.ts file
- `visualRegression.mainBranch` - Main branch name (default: "main")
- `visualRegression.serverStartCommand` - Dev server start command
- `visualRegression.serverPort` - Dev server port
- `visualRegression.serverStartupTime` - Server startup wait time
- `visualRegression.environmentVariables` - Custom environment variables

### Requirements
- Node.js 16+
- Git repository
- Playwright installed
- pages.spec.ts test file
