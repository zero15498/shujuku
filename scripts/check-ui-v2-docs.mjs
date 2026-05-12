import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const selfFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(selfFile), '..');
const planDir = path.join(root, 'plans', 'ui_v2');
const archiveDir = path.join(root, 'plans', '_archive', '2026-05-08-ui_v2_pre_split');
const splitPlan = path.join(root, 'plans', 'ui_v2_docs_split_plan.md');

const legacyNames = [
  'ui_v2_redesign_plan.md',
  'ui_v2_design_guidelines.md',
  'ui_v2_open_questions.md',
  'ui_v2_followup_optimization_directions.md',
];

const idPatterns = [
  /D\d+(?:\.\d+)?/g,
  /P(?:\d+|-[A-Z]+)?-\d+/g,
  /P-DB-\d+/g,
  /SUN-\d+/g,
  /X-\d+/g,
  /G-\d+/g,
];

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function collectIds(files) {
  const text = files.filter(fs.existsSync).map(read).join('\n');
  const ids = new Set();
  for (const pattern of idPatterns) {
    for (const match of text.matchAll(pattern)) ids.add(match[0]);
  }
  return ids;
}

function checkLinks() {
  const missing = [];
  for (const file of walk(planDir, f => f.endsWith('.md'))) {
    const text = read(file);
    const dir = path.dirname(file);
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const targetPath = target.split('#')[0];
      if (!targetPath.trim()) continue;
      const resolved = path.resolve(dir, targetPath);
      if (!fs.existsSync(resolved)) {
        missing.push(`${path.relative(root, file)} -> ${target}`);
      }
    }
  }
  return missing;
}

function checkIdCoverage() {
  const sourceFiles = legacyNames.map(name => path.join(archiveDir, name));
  const newFiles = walk(planDir, f => f.endsWith('.md'));
  const oldIds = collectIds(sourceFiles);
  const newIds = collectIds(newFiles);
  return [...oldIds].filter(id => !newIds.has(id)).sort();
}

function checkLegacyReferences() {
  const ignoredDirs = new Set(['.git', 'node_modules', 'dist']);
  const issues = [];

  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) continue;
        if (full.includes(`${path.sep}.claude${path.sep}worktrees${path.sep}`)) continue;
        scan(full);
        continue;
      }
      if (full.startsWith(archiveDir) || full === splitPlan || full === selfFile) continue;
      if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.gif')) continue;
      const text = read(full);
      for (const legacy of legacyNames) {
        if (text.includes(legacy)) {
          issues.push(`${path.relative(root, full)} references ${legacy}`);
        }
      }
    }
  }

  scan(root);
  return issues;
}

const failures = [];
const missingLinks = checkLinks();
if (missingLinks.length) failures.push(['Missing markdown links', missingLinks]);

const missingIds = checkIdCoverage();
if (missingIds.length) failures.push(['Missing migrated decision IDs', missingIds]);

const legacyRefs = checkLegacyReferences();
if (legacyRefs.length) failures.push(['Legacy pre-split document references outside archive/split plan', legacyRefs]);

if (failures.length) {
  for (const [title, items] of failures) {
    console.error(`\n${title}:`);
    for (const item of items) console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log('UI v2 docs check passed.');
