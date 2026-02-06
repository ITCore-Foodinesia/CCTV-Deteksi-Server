# GitHub Project Setup: CCTV Deteksi Management

## Overview
This document records the setup of the GitHub Project Board using `gh` CLI and GitHub MCP. This serves as an alternative to Linear for project management.

**Project URL:** [https://github.com/users/mridhoda/projects/4](https://github.com/users/mridhoda/projects/4)

## Configuration
- **Project Name:** CCTV Deteksi Management
- **Type:** GitHub Projects (V2)
- **Visibility:** Private (Default) - Only visible to `mridhoda` and collaborators.
- **Owner:** `mridhoda`

## Initial Items
The following issues were automatically added to the project board:

| Issue ID | Title | Priority | Labels |
|----------|-------|----------|--------|
| #1 | [P1] Implement API Authentication | High | security, backend |
| #2 | [P1] Setup CI/CD Pipeline | High | devops |
| #3 | [P1] Setup Automated Testing Framework | High | testing |

## Automation Notes
- **Created via:** `gh` CLI (authenticated as `mridhoda`)
- **Integration:** GitHub MCP used for issue tracking, `gh` CLI used for project board management.
- **Browser Automation:** Playwright was attempted but restricted by authentication requirements on the private project board.

## Workflow Recommendations
1. **Adding Issues:**
   - Use the "Add to Project" side panel in GitHub Issues.
   - Or run: `gh project item-add 4 --owner mridhoda --url <issue-url>`

2. **Managing Views:**
   - Go to the [Project Board](https://github.com/users/mridhoda/projects/4).
   - Create a "Board" view to see Kanban columns (Todo, In Progress, Done).
   - Create a "Table" view for backlog management.

3. **Automation:**
   - Setup "Workflows" in the Project Settings to automatically move items to "Todo" when added.
