# dangerously-skip-review

> ⚠️ **Warning**: These workflows give Claude significant autonomy over your codebase. Use responsibly.

Dangerously Skip Review is a set of GitHub Actions workflows that enable Claude Code to autonomously review PRs, implement fixes, and manage follow-up issues.

By installing the complete workflow, once you push a PR: 

1. Claude will review the PR in detail
2. Claude will evaluate that review to identify must-fix items and issues that can be addressed later
3. Claude will solve the must-fix items 
4. Claude will create follow-up issues to be addressed after the PR is merged
5. Once the PR is merged, Claude will evaluate the follow up issues, decide if they're worth implementing, and if they are, code them up and open new PRs. 
6. The cycle repeats. 

Note: This is an independent enhancement on the normal Github Actions you can install in Claude Code. It is NOT affiliated with or endorsed by Anthropic (yet!) 

## Installation

```bash
npx dangerously-skip-review
```

This will interactively install the workflows to your `.github/workflows/` directory.

### Options

```bash
# Install all workflows at once
npx dangerously-skip-review --all

# Install only the minimal @claude mentions workflow
npx dangerously-skip-review --minimal

# Show help
npx dangerously-skip-review --help
```

## Setup

After installing the workflows, you need to add your Claude Code OAuth token to your repository secrets:

**Note** If you installed the normal Claude Code Github Actions, you don't need to do this. It should work automatically.

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `CLAUDE_CODE_OAUTH_TOKEN`
4. Value: Your OAuth token from [console.anthropic.com](https://console.anthropic.com/)

## Included Workflows

### 1. `claude.yml` - @claude Mentions
Responds to `@claude` mentions in:
- Issue comments
- PR comments
- PR review comments
- New issues

**Trigger**: Any comment/issue containing `@claude`

### 2. `claude-code-review.yml` - Auto PR Review
Automatically reviews pull requests when they're opened.

**Trigger**: PR opened

**Customization**: Uncomment the `paths` filter to only review specific file types, or the `if` condition to only review PRs from certain authors.

### 3. `prioritize-feedback.yml` - Prioritize & Fix
After a code review:
1. Categorizes feedback into "must fix now" vs "create issue for later"
2. Creates GitHub issues for follow-up items
3. **Automatically implements** the must-fix items
4. Commits and pushes the fixes

**Trigger**: Runs after `Claude Code Review` workflow completes

### 4. `verify-fixes.yml` - Verify Fixes
Verifies that the auto-implemented fixes were done correctly and posts a merge readiness assessment.

**Trigger**: Runs after `Prioritize PR Feedback` workflow completes

### 5. `review-follow-up-issues.yml` - Post-Merge Follow-up
After a PR is merged:
1. Finds any follow-up issues created from the PR's code review
2. Reviews each issue to determine if it should be implemented
3. Either closes trivial issues or creates PRs to implement valid suggestions

**Trigger**: PR merged

## Workflow Pipeline

```
PR Opened
    ↓
Claude Code Review (auto-review)
    ↓
Prioritize PR Feedback (categorize & auto-fix)
    ↓
Verify PR Fixes (verify & assess merge readiness)
    ↓
PR Merged
    ↓
Review Follow-up Issues (implement or close deferred issues)
```

## Permissions

The workflows request various GitHub permissions. Review and adjust based on your security requirements:

| Workflow | Key Permissions |
|----------|-----------------|
| claude.yml | `contents: read`, `pull-requests: read`, `issues: read` |
| claude-code-review.yml | Same as above |
| prioritize-feedback.yml | `contents: write`, `pull-requests: write`, `issues: write` |
| verify-fixes.yml | `contents: read`, `pull-requests: write` |
| review-follow-up-issues.yml | `contents: write`, `pull-requests: write`, `issues: write` |

## Customization

Each workflow file includes comments showing optional customizations:
- Filter by file paths
- Filter by PR author
- Adjust Claude's prompts
- Modify allowed tools

## License

MIT
