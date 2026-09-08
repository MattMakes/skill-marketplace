#!/usr/bin/env ts-node

/**
 * Harvest Skill - Clone and install Claude Code skills from GitHub repositories
 *
 * This script:
 * 1. Accepts a GitHub repository URL
 * 2. Clones the repository to a temporary directory
 * 3. Scans for all SKILL.md files (indicating skill directories)
 * 4. Detects name collisions with existing skills
 * 5. Prompts user for renamed skills if collisions exist
 * 6. Copies skills to ~/.claude/skills directory
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import * as readline from 'readline';

interface SkillInfo {
  name: string;
  sourcePath: string;
  newName?: string;
}

interface CollisionResolution {
  originalName: string;
  newName: string;
}

class SkillHarvester {
  private targetDir: string;
  private tempDir: string;

  constructor() {
    this.targetDir = process.env.CLAUDE_SKILLS_DIR || path.join(os.homedir(), '.claude', 'skills');
    this.tempDir = '';
  }

  /**
   * Main entry point for harvesting skills
   */
  async harvest(repoUrl: string, collisionResolutions?: CollisionResolution[]): Promise<void> {
    try {
      console.log(`🌾 Starting harvest from: ${repoUrl}\n`);

      // Validate URL
      const validatedUrl = this.validateGitHubUrl(repoUrl);

      // Clone repository
      this.tempDir = await this.cloneRepository(validatedUrl);

      // Find all skills
      const skills = this.findSkills(this.tempDir);

      if (skills.length === 0) {
        console.log('❌ No skills found in repository (no SKILL.md files detected)');
        return;
      }

      console.log(`\n✅ Found ${skills.length} skill(s):`);
      skills.forEach(skill => console.log(`   - ${skill.name}`));

      // Check for collisions
      const collisions = this.detectCollisions(skills);

      if (collisions.length > 0 && !collisionResolutions) {
        console.log(`\n⚠️  Name collisions detected:`);
        collisions.forEach(skill => console.log(`   - ${skill.name}`));
        console.log('\n📝 To resolve collisions, provide JSON mapping:');
        console.log('   Example: {"originalName": "new-name"}');
        return;
      }

      // Apply collision resolutions
      if (collisionResolutions) {
        this.applyCollisionResolutions(skills, collisionResolutions);
      }

      // Copy skills
      const copied = await this.copySkills(skills);

      console.log(`\n✅ Successfully harvested ${copied} skill(s) to ${this.targetDir}`);

    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n❌ Error: ${error.message}`);
      } else {
        console.error(`\n❌ Unknown error occurred`);
      }
      throw error;
    } finally {
      this.cleanup();
    }
  }

  /**
   * Validate and normalize GitHub URL
   */
  private validateGitHubUrl(url: string): string {
    // Support various GitHub URL formats
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(\.git)?$/,
      /^([^\/]+)\/([^\/]+)$/ // Simple owner/repo format
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const owner = match[1];
        const repo = match[2].replace(/\.git$/, '');
        return `https://github.com/${owner}/${repo}.git`;
      }
    }

    throw new Error(`Invalid GitHub URL format: ${url}\nSupported formats:\n  - https://github.com/owner/repo\n  - git@github.com:owner/repo.git\n  - owner/repo`);
  }

  /**
   * Clone repository to temporary directory using gh CLI
   */
  private async cloneRepository(repoUrl: string): Promise<string> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-harvest-'));

    console.log(`📥 Cloning repository to temporary directory...`);

    try {
      // Use gh repo clone for better GitHub integration
      const repoPath = repoUrl.replace('https://github.com/', '').replace('.git', '');
      execSync(`gh repo clone ${repoPath} "${tempDir}"`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      console.log(`✅ Repository cloned successfully`);
      return tempDir;

    } catch (error) {
      // Fallback to git clone if gh fails
      try {
        execSync(`git clone "${repoUrl}" "${tempDir}"`, {
          stdio: 'pipe',
          encoding: 'utf-8'
        });

        console.log(`✅ Repository cloned successfully`);
        return tempDir;

      } catch (gitError) {
        throw new Error(`Failed to clone repository: ${error}`);
      }
    }
  }

  /**
   * Recursively find all directories containing SKILL.md files
   */
  private findSkills(dir: string, skills: SkillInfo[] = []): SkillInfo[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip common non-skill directories
        if (['.git', 'node_modules', '.github', 'dist', 'build'].includes(entry.name)) {
          continue;
        }

        // Check if this directory contains SKILL.md
        const skillMdPath = path.join(fullPath, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
          skills.push({
            name: entry.name,
            sourcePath: fullPath
          });
        } else {
          // Recursively search subdirectories
          this.findSkills(fullPath, skills);
        }
      }
    }

    return skills;
  }

  /**
   * Detect name collisions with existing skills
   */
  private detectCollisions(skills: SkillInfo[]): SkillInfo[] {
    const collisions: SkillInfo[] = [];

    for (const skill of skills) {
      const targetPath = path.join(this.targetDir, skill.name);
      if (fs.existsSync(targetPath)) {
        collisions.push(skill);
      }
    }

    return collisions;
  }

  /**
   * Apply collision resolutions from user
   */
  private applyCollisionResolutions(skills: SkillInfo[], resolutions: CollisionResolution[]): void {
    const resolutionMap = new Map(
      resolutions.map(r => [r.originalName, r.newName])
    );

    for (const skill of skills) {
      if (resolutionMap.has(skill.name)) {
        const newName = resolutionMap.get(skill.name)!;
        console.log(`📝 Renaming: ${skill.name} → ${newName}`);
        skill.newName = newName;
      }
    }
  }

  /**
   * Copy skills to target directory
   */
  private async copySkills(skills: SkillInfo[]): Promise<number> {
    let copied = 0;

    for (const skill of skills) {
      const targetName = skill.newName || skill.name;
      const targetPath = path.join(this.targetDir, targetName);

      // Final collision check
      if (fs.existsSync(targetPath)) {
        console.log(`⚠️  Skipping ${skill.name}: target already exists at ${targetPath}`);
        continue;
      }

      console.log(`📦 Installing: ${skill.name}${skill.newName ? ` → ${skill.newName}` : ''}`);

      // Copy directory recursively
      this.copyRecursive(skill.sourcePath, targetPath);
      copied++;
    }

    return copied;
  }

  /**
   * Recursively copy directory
   */
  private copyRecursive(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Clean up temporary directory
   */
  private cleanup(): void {
    if (this.tempDir && fs.existsSync(this.tempDir)) {
      console.log(`\n🧹 Cleaning up temporary files...`);
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: harvest.ts <github-url> [collision-resolutions]

Arguments:
  github-url              GitHub repository URL (required)
                         Formats: https://github.com/owner/repo
                                 git@github.com:owner/repo.git
                                 owner/repo

  collision-resolutions  JSON object mapping original names to new names (optional)
                         Format: '{"old-name": "new-name"}'

Examples:
  harvest.ts https://github.com/user/skills-repo
  harvest.ts user/skills-repo
  harvest.ts user/repo '{"pdf": "pdf-editor", "docx": "docx-pro"}'
    `);
    process.exit(1);
  }

  const repoUrl = args[0];
  let collisionResolutions: CollisionResolution[] | undefined;

  if (args.length > 1) {
    try {
      const resolutionMap = JSON.parse(args[1]);
      collisionResolutions = Object.entries(resolutionMap).map(([originalName, newName]) => ({
        originalName,
        newName: newName as string
      }));
    } catch (error) {
      console.error('❌ Invalid collision resolutions JSON format');
      process.exit(1);
    }
  }

  const harvester = new SkillHarvester();
  await harvester.harvest(repoUrl, collisionResolutions);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    process.exit(1);
  });
}

export { SkillHarvester };
export type { SkillInfo, CollisionResolution };
