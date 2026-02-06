# MCP Settings Reference

This document explains the MCP (Model Context Protocol) server configuration used by Kilo Code.

## File Location

```
%APPDATA%\Code\User\globalStorage\kilocode.kilo-code\settings\mcp_settings.json
```

---

## Configuration Structure

Each MCP server entry follows this schema:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | No* | Connection type. Use `"streamable-http"` for HTTP-based servers. Omit for stdio-based (npx) servers. |
| `url` | string | Conditional | Required when `type` is `"streamable-http"`. The server endpoint URL. |
| `command` | string | Conditional | Required for stdio servers. Typically `"npx"`. |
| `args` | array | Conditional | Required for stdio servers. Command-line arguments. |
| `disabled` | boolean | No | Set `true` to disable without removing. Default: `false`. |
| `alwaysAllow` | array | No | List of tool names to auto-approve (skip confirmation prompts). |

---

## Server Descriptions

### 1. graphiti (HTTP-based)

- **Purpose**: Graph-based knowledge/memory storage
- **Type**: `streamable-http`
- **Default State**: Disabled
- **Requires**: Local server running on `http://localhost:8000/mcp/`

### 2. playwright

- **Purpose**: Browser automation for web testing and screenshots
- **Tools Available**: 
  - `browser_navigate`, `browser_click`, `browser_type`
  - `browser_snapshot`, `browser_evaluate`
  - `browser_tabs`, `browser_wait_for`, etc.
- **Mode**: Headless Chrome

### 3. sequentialthinking

- **Purpose**: Structured problem-solving through step-by-step reasoning
- **Use Case**: Complex analysis, debugging, architecture decisions

### 4. memory

- **Purpose**: Persistent knowledge graph storage
- **Tools Available**: 
  - `create_entities`, `create_relations`
  - `search_nodes`, `read_graph`

### 5. filesystem

- **Purpose**: File system access within allowed directories
- **Tools Available**: 
  - `read_file`, `write_file`, `edit_file`
  - `list_directory`, `search_files`
- **Security**: Restricted to specified directory paths only

### 6. git (Disabled)

- **Purpose**: Git repository operations
- **Note**: Uses MCP Inspector wrapper, may have performance overhead
- **Default State**: Disabled

---

## Best Practices

### 1. Always Include `disabled` Field

Explicit is better than implicit. Always include `"disabled": false` even for enabled servers.

```json
{
  "disabled": false
}
```

### 2. Always Include `alwaysAllow` Field

Even if empty, include it for consistency:

```json
{
  "alwaysAllow": []
}
```

### 3. Use Environment Variables for Paths (When Possible)

Hardcoded paths like `/Users/humblebreads/...` break portability.

**Current (Problematic):**
```json
"args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/humblebreads/Documents/projects"]
```

**Better (If Supported):**
Document the path requirement in your project README, or use relative paths when feasible.

### 4. Minimize `alwaysAllow` for Security

Only auto-approve tools that are:
- Read-only (low risk)
- Frequently used (reduce friction)
- Well-understood (no surprises)

**Risky to Always Allow:**
- `browser_file_upload` - can upload sensitive files
- `browser_evaluate` - can execute arbitrary JS

### 5. Format JSON for Readability

Single-line JSON is impossible to review in PRs. Always format with 2-space indentation.

---

## Troubleshooting

### Server Not Appearing

1. Check `disabled` is `false` or omitted
2. Verify `npx` can access the package (run manually in terminal)
3. Check for typos in server name

### "Browser Not Installed" Error

For Playwright, run:
```bash
npx playwright install chromium
```

Or use the `browser_install` tool.

### Permission Denied on Filesystem

The `filesystem` server only allows access to directories listed in `args`. Add required paths to the array.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-31 | Initial documentation created |
