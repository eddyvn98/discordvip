# MCP Servers Setup Guide

## Installed MCP Servers

This project has the following MCP servers configured in `.qoder/mcp-settings.json`:

### 1. GitHub MCP Server
**Package:** `@modelcontextprotocol/server-github`

**Purpose:** Access GitHub API for repository operations, PR management, issue tracking, and more.

**Required Setup:**
- You need a GitHub Personal Access Token with scopes: `repo`, `read:org`, `read:packages`
- When you first use GitHub MCP features, you'll be prompted to enter this token
- Create a token at: https://github.com/settings/tokens

**Available Operations:**
- Create/update issues
- Manage pull requests
- Read/write repository contents
- Access commits and branches
- Manage releases

### 2. Playwright MCP Server
**Package:** `@playwright/mcp@latest`

**Purpose:** Browser automation for E2E testing, web scraping, and UI validation.

**No additional setup required.** Playwright will download browser binaries automatically.

**Available Operations:**
- Navigate web pages
- Click elements, fill forms
- Take screenshots
- Evaluate JavaScript
- Test UI interactions

### 3. ESLint MCP Server
**Package:** `@eslint/mcp@latest`

**Purpose:** Code quality analysis, linting, and finding code issues.

**No additional setup required.** Uses the project's existing ESLint configuration.

**Available Operations:**
- Lint files and directories
- Get linting results with fix suggestions
- Analyze code quality issues

## Configuration Files

- `.qoder/mcp-settings.json` - MCP server definitions
- `.qoder/inputs.json` - Input variable definitions (GitHub token)

## Next Steps

1. **Restart Qoder** to load the new MCP configuration
2. **Create GitHub Token** if you haven't already:
   - Go to https://github.com/settings/tokens
   - Create a new token with scopes: `repo`, `read:org`, `read:packages`
   - Save it securely
3. **Test the servers** by asking Qoder to:
   - GitHub: "List recent pull requests"
   - Playwright: "Open localhost:3000 and take a screenshot"
   - ESLint: "Lint the src directory"

## Troubleshooting

**MCP servers not loading:**
- Ensure you've restarted Qoder after adding the configuration
- Check that Node.js 16+ is installed: `node --version`
- Verify JSON syntax in `.qoder/mcp-settings.json`

**GitHub server not working:**
- Ensure your token has the required scopes
- Check that the token hasn't expired
- Verify network connectivity to api.github.com

**Playwright server issues:**
- First run may take time to download browser binaries
- Ensure you have sufficient disk space
- Check firewall settings if browsers fail to download

## Additional Resources

- MCP Documentation: https://docs.qoder.com/qoderwork/mcp
- GitHub MCP Server: https://github.com/modelcontextprotocol/servers/tree/main/src/github
- Playwright MCP: https://www.npmjs.com/package/@playwright/mcp
- ESLint MCP: https://www.npmjs.com/package/@eslint/mcp
