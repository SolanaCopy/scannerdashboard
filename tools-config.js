// tools-config.js — machine-onafhankelijke tool- en modelconfiguratie voor het dashboard.
// Zelfde idee als in de Scanner-repo: env → PATH → Windows-fallback → kale naam.

const fs = require('fs');
const path = require('path');

const WIN_FOUNDRY = 'C:/Users/moham/.foundry/bin';

function fileExists(p) {
  try { return !!p && fs.existsSync(p) && fs.statSync(p).isFile(); } catch (e) { return false; }
}

function which(cmd) {
  if (!cmd) return null;
  if (cmd.includes('/') || cmd.includes('\\')) return fileExists(cmd) ? cmd : null;
  const exts = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';')
    : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const full = path.join(dir, cmd + ext);
      if (fileExists(full)) return full;
    }
  }
  return null;
}

function resolveTool(envVar, bareName, fallbacks = []) {
  const envVal = process.env[envVar];
  if (envVal) return envVal;
  const onPath = which(bareName);
  if (onPath) return onPath;
  for (const fb of fallbacks) if (fileExists(fb)) return fb;
  return bareName;
}

function augmentPath(baseEnv = process.env) {
  const dirs = [WIN_FOUNDRY].filter(d => { try { return fs.existsSync(d); } catch (e) { return false; } });
  const merged = [baseEnv.PATH || '', ...dirs].filter(Boolean).join(path.delimiter);
  return { ...baseEnv, PATH: merged };
}

const ANVIL = resolveTool('ANVIL_PATH', 'anvil', [`${WIN_FOUNDRY}/anvil.exe`]);
const FORGE = resolveTool('FORGE_PATH', 'forge', [`${WIN_FOUNDRY}/forge.exe`]);
const CAST  = resolveTool('CAST_PATH',  'cast',  [`${WIN_FOUNDRY}/cast.exe`]);

// Modellen env-overschrijfbaar; defaults = huidige, nog-geserveerde ID's
// (de oude date-suffixed claude-*-4-20250514 zijn vervangen).
const MODEL_SONNET = process.env.AI_MODEL_SONNET || 'claude-sonnet-4-6';
const MODEL_OPUS   = process.env.AI_MODEL_OPUS   || 'claude-opus-4-6';

const ATTACK_VECTORS_FILE = (() => {
  const candidates = [
    process.env.ATTACK_VECTORS_FILE,
    path.join(__dirname, 'references', 'attack-vectors.md'),
    'C:/pashov-skills/solidity-auditor/references/attack-vectors/attack-vectors.md',
  ].filter(Boolean);
  for (const c of candidates) if (fileExists(c)) return c;
  return candidates.find(Boolean) || '';
})();

module.exports = { ANVIL, FORGE, CAST, MODEL_SONNET, MODEL_OPUS, ATTACK_VECTORS_FILE, augmentPath, which, fileExists };
