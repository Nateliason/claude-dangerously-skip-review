const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { WORKFLOWS, COLORS, findGitRoot, copyWorkflow } = require('../bin/cli');

describe('CLI', () => {
  describe('WORKFLOWS', () => {
    it('should have 5 workflows defined', () => {
      assert.strictEqual(WORKFLOWS.length, 5);
    });

    it('should have claude.yml marked as required', () => {
      const claudeWorkflow = WORKFLOWS.find((w) => w.file === 'claude.yml');
      assert.ok(claudeWorkflow, 'claude.yml should exist');
      assert.strictEqual(claudeWorkflow.required, true);
    });

    it('should have all other workflows marked as not required', () => {
      const optionalWorkflows = WORKFLOWS.filter((w) => w.file !== 'claude.yml');
      for (const workflow of optionalWorkflows) {
        assert.strictEqual(
          workflow.required,
          false,
          `${workflow.file} should not be required`
        );
      }
    });

    it('should have all workflow files exist in workflows directory', () => {
      const workflowsDir = path.join(__dirname, '..', 'workflows');
      for (const workflow of WORKFLOWS) {
        const workflowPath = path.join(workflowsDir, workflow.file);
        assert.ok(
          fs.existsSync(workflowPath),
          `Workflow file should exist: ${workflow.file}`
        );
      }
    });
  });

  describe('COLORS', () => {
    it('should have all required color codes', () => {
      const requiredColors = ['reset', 'bright', 'red', 'green', 'yellow', 'blue', 'cyan'];
      for (const color of requiredColors) {
        assert.ok(COLORS[color], `Color ${color} should be defined`);
        assert.ok(COLORS[color].startsWith('\x1b['), `Color ${color} should be an ANSI escape code`);
      }
    });
  });

  describe('findGitRoot', () => {
    let tempDir;

    before(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    });

    after(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return null when not in a git repository', () => {
      const result = findGitRoot(tempDir);
      assert.strictEqual(result, null);
    });

    it('should find git root from current directory', () => {
      const gitDir = path.join(tempDir, 'git-repo');
      fs.mkdirSync(gitDir);
      fs.mkdirSync(path.join(gitDir, '.git'));

      const result = findGitRoot(gitDir);
      assert.strictEqual(result, gitDir);
    });

    it('should find git root from nested directory', () => {
      const gitDir = path.join(tempDir, 'nested-git-repo');
      const nestedDir = path.join(gitDir, 'src', 'components');
      fs.mkdirSync(path.join(gitDir, '.git'), { recursive: true });
      fs.mkdirSync(nestedDir, { recursive: true });

      const result = findGitRoot(nestedDir);
      assert.strictEqual(result, gitDir);
    });
  });

  describe('copyWorkflow', () => {
    let tempDir;

    before(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
    });

    after(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should copy a workflow file to target directory', () => {
      const targetPath = copyWorkflow('claude.yml', tempDir);

      assert.ok(fs.existsSync(targetPath), 'Copied file should exist');
      assert.strictEqual(path.basename(targetPath), 'claude.yml');

      const content = fs.readFileSync(targetPath, 'utf8');
      assert.ok(content.includes('name:'), 'Workflow should have a name field');
    });

    it('should throw error for non-existent workflow', () => {
      assert.throws(
        () => copyWorkflow('non-existent.yml', tempDir),
        /Source workflow not found/
      );
    });

    it('should copy all workflow files successfully', () => {
      const targetDir = path.join(tempDir, 'all-workflows');
      fs.mkdirSync(targetDir, { recursive: true });

      for (const workflow of WORKFLOWS) {
        const targetPath = copyWorkflow(workflow.file, targetDir);
        assert.ok(
          fs.existsSync(targetPath),
          `${workflow.file} should be copied successfully`
        );
      }
    });
  });

  describe('workflow files validity', () => {
    it('all workflow files should be valid YAML', () => {
      const workflowsDir = path.join(__dirname, '..', 'workflows');

      for (const workflow of WORKFLOWS) {
        const workflowPath = path.join(workflowsDir, workflow.file);
        const content = fs.readFileSync(workflowPath, 'utf8');

        // Basic YAML structure checks
        assert.ok(
          content.includes('name:'),
          `${workflow.file} should have a name field`
        );
        assert.ok(
          content.includes('on:'),
          `${workflow.file} should have an on: trigger`
        );
        assert.ok(
          content.includes('jobs:'),
          `${workflow.file} should have jobs defined`
        );
      }
    });

    it('all workflow files should reference CLAUDE_CODE_OAUTH_TOKEN', () => {
      const workflowsDir = path.join(__dirname, '..', 'workflows');

      for (const workflow of WORKFLOWS) {
        const workflowPath = path.join(workflowsDir, workflow.file);
        const content = fs.readFileSync(workflowPath, 'utf8');

        assert.ok(
          content.includes('CLAUDE_CODE_OAUTH_TOKEN') ||
            content.includes('ANTHROPIC_API_KEY'),
          `${workflow.file} should reference authentication token`
        );
      }
    });
  });
});
