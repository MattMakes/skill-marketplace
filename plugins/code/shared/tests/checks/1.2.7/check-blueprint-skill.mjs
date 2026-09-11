#!/usr/bin/env node
// G4: skills/blueprint/SKILL.md has parseable frontmatter (name blueprint, a
// description, license MIT, metadata.version and metadata.based_on), is under
// 500 lines, names the bin path under ${CLAUDE_PLUGIN_ROOT}, has no "Update
// awareness" section; and plugin.json plus marketplace.json mention blueprint.
//
// Usage: node check-blueprint-skill.mjs
// Exit 0 and print `blueprint-skill verification passed`; 1 on a failed assertion; 2 on misuse.
import fs from 'node:fs';
import path from 'node:path';
import { PLUGIN, SKILL, report } from './_lib.mjs';

if (process.argv.length > 2) { console.error('usage: node check-blueprint-skill.mjs'); process.exit(2); }
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const skillMd = path.join(SKILL, 'SKILL.md');
check(fs.existsSync(skillMd), 'skills/blueprint/SKILL.md is missing');
const text = fs.existsSync(skillMd) ? fs.readFileSync(skillMd, 'utf8') : '';
const lines = text.split('\n');
check(lines.length < 500, `SKILL.md has ${lines.length} lines (limit 500)`);

// Minimal YAML frontmatter parser: top-level `key: value` and one level of `  key: value`.
const m = text.match(/^---\n([\s\S]*?)\n---\n/);
check(!!m, 'SKILL.md has no frontmatter block');
const fm = {};
if (m) {
  let parent = null;
  for (const raw of m[1].split('\n')) {
    if (!raw.trim()) continue;
    const nested = /^ {2}([\w.-]+):\s*(.*)$/.exec(raw);
    const top = /^([\w.-]+):\s*(.*)$/.exec(raw);
    const unq = (v) => v.replace(/^"(.*)"$/, '$1');
    if (nested && parent) fm[parent][nested[1]] = unq(nested[2]);
    else if (top) { if (top[2] === '') { parent = top[1]; fm[parent] = {}; } else { parent = null; fm[top[1]] = unq(top[2]); } }
    else failures.push(`frontmatter line does not parse: ${raw}`);
  }
}
check(fm.name === 'blueprint', `frontmatter name is ${JSON.stringify(fm.name)}, expected blueprint`);
check(typeof fm.description === 'string' && fm.description.length > 100, 'frontmatter description is missing or too short');
check(/ddd export blueprint --deliver/.test(fm.description || ''), 'description does not mention `ddd export blueprint --deliver`');
check(/architecture.*workflow.*sequence.*data-?flow.*lifecycle/i.test(fm.description || ''), 'description does not list the five diagram types');
check(fm.license === 'MIT', `frontmatter license is ${JSON.stringify(fm.license)}`);
check(fm.metadata && fm.metadata.version === '2.17-blueprint.1', `metadata.version is ${JSON.stringify(fm.metadata?.version)}`);
check(fm.metadata && /archify by tt-a1i \(MIT\)/.test(fm.metadata.based_on || ''), 'metadata.based_on does not credit archify by tt-a1i (MIT)');
check(text.includes('${CLAUDE_PLUGIN_ROOT}/skills/blueprint/bin/blueprint.mjs'), 'SKILL.md does not name ${CLAUDE_PLUGIN_ROOT}/skills/blueprint/bin/blueprint.mjs');
check(!/node bin\/blueprint\.mjs/.test(text), 'SKILL.md still has a bare `node bin/blueprint.mjs` command');
check(!/Update awareness/i.test(text), 'SKILL.md still has the Update awareness section');
check(!/check-update/.test(text), 'SKILL.md still mentions check-update');
const body = text.slice(m ? m[0].length : 0);
check(!/archify/i.test(body), 'SKILL.md body mentions archify');

// The plugin manifests must list blueprint.
const manifests = [
  path.join(PLUGIN, '.claude-plugin', 'plugin.json'),
  path.resolve(PLUGIN, '..', '..', '.claude-plugin', 'marketplace.json'),
];
for (const file of manifests) {
  const rel = path.relative(path.resolve(PLUGIN, '..', '..'), file);
  if (!fs.existsSync(file)) { failures.push(`${rel} is missing`); continue; }
  let json;
  try { json = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { failures.push(`${rel} is not valid JSON: ${e.message}`); continue; }
  const entry = rel.endsWith('marketplace.json') ? (json.plugins || []).find((p) => p.name === 'code') : json;
  if (!entry) { failures.push(`${rel} has no plugin entry named code`); continue; }
  const blob = JSON.stringify(entry);
  if (!/blueprint/i.test(blob)) {
    failures.push(`${rel} (code entry) does not mention blueprint. Add to its description: "Includes blueprint, the bundled diagram renderer (architecture, workflow, sequence, data-flow and lifecycle diagrams as standalone HTML) that ddd export blueprint --deliver uses and that can be used on its own." and add "blueprint" to its keywords.`);
  }
}
report('blueprint-skill', failures);
