#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const WORKFLOWS = [
  { file: 'claude.yml', name: 'Claude Code (@claude mentions)', required: true },
  { file: 'claude-code-review.yml', name: 'Claude Code Review (auto-review PRs)', required: false },
  { file: 'prioritize-feedback.yml', name: 'Prioritize PR Feedback (auto-fix issues)', required: false },
  { file: 'verify-fixes.yml', name: 'Verify PR Fixes', required: false },
  { file: 'review-follow-up-issues.yml', name: 'Review Follow-up Issues (post-merge)', required: false },
];

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logStep(message) {
  log(`\n→ ${message}`, COLORS.cyan);
}

function logSuccess(message) {
  log(`✓ ${message}`, COLORS.green);
}

function logWarning(message) {
  log(`⚠ ${message}`, COLORS.yellow);
}

function logError(message) {
  log(`✗ ${message}`, COLORS.red);
}

function showHelp() {
  console.log(`
${COLORS.bright}dangerously-skip-review${COLORS.reset} - Install Claude Code GitHub Actions workflows

${COLORS.bright}USAGE${COLORS.reset}
  npx dangerously-skip-review [options]

${COLORS.bright}OPTIONS${COLORS.reset}
  --all         Install all workflows (default: interactive selection)
  --minimal     Install only the base @claude mentions workflow
  --help, -h    Show this help message

${COLORS.bright}WORKFLOWS INCLUDED${COLORS.reset}
  • claude.yml                  - Respond to @claude mentions in issues/PRs
  • claude-code-review.yml      - Auto-review PRs when opened
  • prioritize-feedback.yml     - Prioritize feedback and auto-implement fixes
  • verify-fixes.yml            - Verify fixes were implemented correctly
  • review-follow-up-issues.yml - Review follow-up issues after PR merge

${COLORS.bright}SETUP${COLORS.reset}
  After installation, add CLAUDE_CODE_OAUTH_TOKEN to your repository secrets.
  Get the token from: https://console.anthropic.com/
`);
}

function findGitRoot(startDir) {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function copyWorkflow(workflowFile, targetDir) {
  const sourceDir = path.join(__dirname, '..', 'workflows');
  const sourcePath = path.join(sourceDir, workflowFile);
  const targetPath = path.join(targetDir, workflowFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source workflow not found: ${sourcePath}`);
  }

  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

async function promptSelection(workflows) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log(`\n${COLORS.bright}Select workflows to install:${COLORS.reset}\n`);

  const selected = [];

  for (let i = 0; i < workflows.length; i++) {
    const w = workflows[i];
    const marker = w.required ? ' (recommended)' : '';
    const defaultAnswer = w.required ? 'Y' : 'n';
    const answer = await question(
      `  ${i + 1}. ${w.name}${marker} [${defaultAnswer}]: `
    );

    const shouldInstall =
      answer.toLowerCase() === 'y' ||
      answer.toLowerCase() === 'yes' ||
      (answer === '' && w.required);

    if (shouldInstall) {
      selected.push(w);
    }
  }

  rl.close();
  return selected;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  log(`\n${COLORS.bright}🤖 dangerously-skip-review${COLORS.reset}`);
  log('Install Claude Code GitHub Actions for autonomous code reviews\n');

  // Find git root
  const gitRoot = findGitRoot(process.cwd());
  if (!gitRoot) {
    logError('Not in a git repository. Please run this from within a git repo.');
    process.exit(1);
  }

  logStep(`Found git repository at: ${gitRoot}`);

  // Create .github/workflows directory
  const workflowsDir = path.join(gitRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
    logSuccess('Created .github/workflows directory');
  }

  // Determine which workflows to install
  let workflowsToInstall;

  if (args.includes('--all')) {
    workflowsToInstall = WORKFLOWS;
    logStep('Installing all workflows...');
  } else if (args.includes('--minimal')) {
    workflowsToInstall = WORKFLOWS.filter((w) => w.required);
    logStep('Installing minimal workflow set...');
  } else {
    // Interactive selection
    workflowsToInstall = await promptSelection(WORKFLOWS);
  }

  if (workflowsToInstall.length === 0) {
    logWarning('No workflows selected. Exiting.');
    process.exit(0);
  }

  // Copy selected workflows
  logStep('Installing workflows...');
  const installed = [];
  const skipped = [];

  for (const workflow of workflowsToInstall) {
    const targetPath = path.join(workflowsDir, workflow.file);

    if (fs.existsSync(targetPath)) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) =>
        rl.question(
          `  ${workflow.file} already exists. Overwrite? [y/N]: `,
          resolve
        )
      );
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        skipped.push(workflow.file);
        continue;
      }
    }

    try {
      copyWorkflow(workflow.file, workflowsDir);
      installed.push(workflow.file);
      logSuccess(`Installed ${workflow.file}`);
    } catch (err) {
      logError(`Failed to install ${workflow.file}: ${err.message}`);
    }
  }

  // Summary
  console.log(`\n${COLORS.bright}Summary${COLORS.reset}`);
  if (installed.length > 0) {
    logSuccess(`Installed ${installed.length} workflow(s)`);
  }
  if (skipped.length > 0) {
    logWarning(`Skipped ${skipped.length} workflow(s) (already exist)`);
  }

  // Next steps
  console.log(`\n${COLORS.bright}Next Steps${COLORS.reset}`);
  console.log(`
1. Add ${COLORS.cyan}CLAUDE_CODE_OAUTH_TOKEN${COLORS.reset} to your repository secrets:
   → Go to: Settings → Secrets and variables → Actions → New repository secret

2. Get your OAuth token from:
   → https://console.anthropic.com/

3. (Optional) Customize the workflows in .github/workflows/

4. Commit and push the workflow files:
   ${COLORS.cyan}git add .github/workflows/
   git commit -m "Add Claude Code workflows"
   git push${COLORS.reset}

${COLORS.yellow}⚠ Warning:${COLORS.reset} These workflows give Claude significant autonomy.
   Review the workflow files and adjust permissions as needed.
`);
}

main().catch((err) => {
  logError(`Error: ${err.message}`);
  process.exit(1);
});
