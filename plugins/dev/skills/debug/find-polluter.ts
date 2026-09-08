#!/usr/bin/env npx tsx
/**
 * Bisection script to find which test creates unwanted files/state.
 * Cross-platform replacement for find-polluter.sh.
 *
 * Usage: npx tsx find-polluter.ts <file_or_dir_to_check> <test_glob_pattern>
 * Example: npx tsx find-polluter.ts '.git' 'src/**/*.test.ts'
 */

import { execSync } from "child_process";
import { existsSync, statSync } from "fs";
import { glob } from "glob";
import { resolve } from "path";

async function main(): Promise<void> {
  const [pollutionCheck, testPattern] = process.argv.slice(2);

  if (!pollutionCheck || !testPattern) {
    console.error("Usage: npx tsx find-polluter.ts <file_to_check> <test_pattern>");
    console.error('Example: npx tsx find-polluter.ts ".git" "src/**/*.test.ts"');
    process.exit(1);
  }

  console.log(`Searching for test that creates: ${pollutionCheck}`);
  console.log(`Test pattern: ${testPattern}\n`);

  const testFiles = (await glob(testPattern)).sort();
  const total = testFiles.length;

  console.log(`Found ${total} test files\n`);

  if (total === 0) {
    console.error("No test files found matching pattern.");
    process.exit(1);
  }

  for (let i = 0; i < total; i++) {
    const testFile = testFiles[i];

    if (existsSync(pollutionCheck)) {
      console.log(`Warning: Pollution already exists before test ${i + 1}/${total}`);
      console.log(`   Skipping: ${testFile}`);
      continue;
    }

    console.log(`[${i + 1}/${total}] Testing: ${testFile}`);

    try {
      execSync(`npm test "${testFile}"`, { stdio: "ignore" });
    } catch {
      // Test failure is OK — we're looking for side effects, not pass/fail
    }

    if (existsSync(pollutionCheck)) {
      console.log(`\nFOUND POLLUTER!`);
      console.log(`   Test: ${testFile}`);
      console.log(`   Created: ${pollutionCheck}\n`);

      try {
        const stat = statSync(pollutionCheck);
        console.log(`Pollution details:`);
        console.log(`  Size: ${stat.size} bytes`);
        console.log(`  Type: ${stat.isDirectory() ? "directory" : "file"}`);
        console.log(`  Modified: ${stat.mtime.toISOString()}\n`);
      } catch {
        // stat failed, skip details
      }

      console.log(`To investigate:`);
      console.log(`  npm test "${testFile}"    # Run just this test`);
      console.log(`  cat ${testFile}           # Review test code`);
      process.exit(1);
    }
  }

  console.log(`\nNo polluter found - all tests clean!`);
  process.exit(0);
}

main();
