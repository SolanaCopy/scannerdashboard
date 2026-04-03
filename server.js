const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3099;
const SCANNER_API_KEY = process.env.SCANNER_API_KEY || 'bsc-scanner-2026-secret';
const DASH_KEY = process.env.DASH_KEY || 'Tanger2026@';

app.use(express.json({ limit: '10mb' }));

// === PERSISTENCE ===
const DATA_DIR = path.join(__dirname, 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'scan_results.json');
const EXPLOITS_FILE = path.join(DATA_DIR, 'exploit_results.json');
const ECHIDNA_FILE = path.join(DATA_DIR, 'echidna_results.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function saveJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data)); } catch (e) { console.error('Save error:', e.message); }
}

// === STATE (laden van disk) ===
let scannerResults = loadJSON(RESULTS_FILE);
let exploitResults = loadJSON(EXPLOITS_FILE);
let echidnaResults = loadJSON(ECHIDNA_FILE);
console.log(`[LOAD] ${scannerResults.length} resultaten, ${exploitResults.length} exploits, ${echidnaResults.length} echidna geladen van disk`);

// === AUTH ===
function authDash(req, res) {
  const key = req.query.key;
  if (key !== DASH_KEY) { res.status(403).send('Unauthorized'); return false; }
  return true;
}

// === API: Scanner pusht resultaten ===
app.post('/api/scanner/results', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== SCANNER_API_KEY) return res.status(403).json({ error: 'Unauthorized' });

  let body = req.body;
  if (Array.isArray(body)) {
    scannerResults = body.slice(0, 500);
  } else if (body.result) {
    const idx = scannerResults.findIndex(r => r.address?.toLowerCase() === body.result.address?.toLowerCase());
    if (idx >= 0) scannerResults[idx] = body.result;
    else scannerResults.unshift(body.result);
    if (scannerResults.length > 500) scannerResults.pop();
  }
  saveJSON(RESULTS_FILE, scannerResults);
  return res.json({ ok: true, count: scannerResults.length });
});

// === API: Scanner pusht exploit resultaten ===
app.post('/api/scanner/exploit', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== SCANNER_API_KEY) return res.status(403).json({ error: 'Unauthorized' });

  let body = req.body;
  if (body.result) {
    const idx = exploitResults.findIndex(r => r.address?.toLowerCase() === body.result.address?.toLowerCase());
    if (idx >= 0) exploitResults[idx] = body.result;
    else exploitResults.unshift(body.result);
    if (exploitResults.length > 200) exploitResults.pop();

    // Update ook scannerResults met exploit data
    const si = scannerResults.findIndex(r => r.address?.toLowerCase() === body.result.address?.toLowerCase());
    if (si >= 0) {
      scannerResults[si].exploitResult = body.result;
      saveJSON(RESULTS_FILE, scannerResults);
    }
  }
  saveJSON(EXPLOITS_FILE, exploitResults);
  return res.json({ ok: true, count: exploitResults.length });
});

// === API: Scanner pusht echidna resultaten ===
app.post('/api/scanner/echidna', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== SCANNER_API_KEY) return res.status(403).json({ error: 'Unauthorized' });

  let body = req.body;
  if (body.result) {
    const idx = echidnaResults.findIndex(r => r.address?.toLowerCase() === body.result.address?.toLowerCase());
    if (idx >= 0) echidnaResults[idx] = body.result;
    else echidnaResults.unshift(body.result);
    if (echidnaResults.length > 200) echidnaResults.pop();

    // Update ook scannerResults met echidna data
    const si = scannerResults.findIndex(r => r.address?.toLowerCase() === body.result.address?.toLowerCase());
    if (si >= 0) {
      scannerResults[si].echidna = body.result;
      saveJSON(RESULTS_FILE, scannerResults);
    }
  }
  saveJSON(ECHIDNA_FILE, echidnaResults);
  return res.json({ ok: true, count: echidnaResults.length });
});

// === API: Dashboard haalt resultaten ===
app.get('/api/scanner/results', (req, res) => {
  if (!authDash(req, res)) return;
  return res.json(scannerResults);
});

// === API: Dashboard haalt exploits ===
app.get('/api/scanner/exploit', (req, res) => {
  if (!authDash(req, res)) return;
  return res.json(exploitResults);
});

// === API: Dashboard haalt echidna ===
app.get('/api/scanner/echidna', (req, res) => {
  if (!authDash(req, res)) return;
  return res.json(echidnaResults);
});

// === API: Scanner status ===
app.get('/api/scanner/status', (req, res) => {
  if (!authDash(req, res)) return;
  const total = scannerResults.length;
  const withHigh = scannerResults.filter(r => r.totalHigh > 0).length;
  const exploitable = scannerResults.filter(r => r.exploitResult?.exploitable).length;
  const totalBalance = scannerResults.reduce((sum, r) => sum + (r.balanceUsd || 0), 0);
  return res.json({ total, withHigh, exploitable, totalBalance });
});

// === API: Delete een resultaat ===
app.delete('/api/scanner/results/:address', (req, res) => {
  if (!authDash(req, res)) return;
  const addr = req.params.address.toLowerCase();
  const before = scannerResults.length;
  scannerResults = scannerResults.filter(r => r.address?.toLowerCase() !== addr);
  exploitResults = exploitResults.filter(r => r.address?.toLowerCase() !== addr);
  saveJSON(RESULTS_FILE, scannerResults);
  saveJSON(EXPLOITS_FILE, exploitResults);
  return res.json({ ok: true, removed: before - scannerResults.length });
});

// === FOUNDRY LAB ===
const ANVIL_PATH = 'C:/Users/moham/.foundry/bin/anvil.exe';
const FORGE_PATH = 'C:/Users/moham/.foundry/bin/forge.exe';
const CAST_PATH = 'C:/Users/moham/.foundry/bin/cast.exe';
const BSC_RPC = 'https://bsc-mainnet.public.blastapi.io';
const BSCSCAN_KEY = process.env.BSCSCAN_API_KEY || 'P3RD5KVMAP39CB25HM97THVDXHVDCNEUIX';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
let anvilProcess = null;
let anvilPort = 8545;
let anvilTarget = null;
const FOUNDRY_TMP = path.join(__dirname, 'tmp_foundry');
if (!fs.existsSync(FOUNDRY_TMP)) fs.mkdirSync(FOUNDRY_TMP, { recursive: true });

// Start Anvil fork
app.post('/api/foundry/fork', (req, res) => {
  if (!authDash(req, res)) return;
  const { address, blockNumber } = req.body;
  if (!address) return res.status(400).json({ error: 'Address vereist' });

  // Kill bestaande fork
  if (anvilProcess) { try { anvilProcess.kill(); } catch(e) {} anvilProcess = null; }

  const args = ['--fork-url', BSC_RPC, '--port', String(anvilPort), '--chain-id', '56', '--no-mining'];
  if (blockNumber) args.push('--fork-block-number', String(blockNumber));

  try {
    anvilProcess = spawn(ANVIL_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    anvilTarget = address;
    let started = false;

    const onData = (d) => {
      const out = d.toString();
      if (out.includes('Listening on') && !started) {
        started = true;
        res.json({ ok: true, port: anvilPort, address, rpc: `http://127.0.0.1:${anvilPort}` });
      }
    };
    anvilProcess.stdout.on('data', onData);
    anvilProcess.stderr.on('data', onData);

    anvilProcess.on('error', (err) => {
      if (!started) res.status(500).json({ error: err.message });
    });

    anvilProcess.on('exit', () => { anvilProcess = null; anvilTarget = null; });

    // Timeout na 15s
    setTimeout(() => { if (!started) { try { anvilProcess.kill(); } catch(e) {} res.status(500).json({ error: 'Anvil timeout' }); } }, 15000);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Stop Anvil fork
app.post('/api/foundry/stop', (req, res) => {
  if (!authDash(req, res)) return;
  if (anvilProcess) { try { anvilProcess.kill(); } catch(e) {} anvilProcess = null; anvilTarget = null; }
  return res.json({ ok: true });
});

// Anvil status
app.get('/api/foundry/status', (req, res) => {
  if (!authDash(req, res)) return;
  return res.json({ running: !!anvilProcess, address: anvilTarget, port: anvilPort });
});

// Fetch contract source + ABI van BSCScan
app.get('/api/foundry/contract/:address', async (req, res) => {
  if (!authDash(req, res)) return;
  const addr = req.params.address;
  try {
    const axios = require('axios');
    const [srcRes, abiRes] = await Promise.all([
      axios.get(`https://api.etherscan.io/v2/api?chainid=56&module=contract&action=getsourcecode&address=${addr}&apikey=${BSCSCAN_KEY}`),
      axios.get(`https://api.etherscan.io/v2/api?chainid=56&module=contract&action=getabi&address=${addr}&apikey=${BSCSCAN_KEY}`)
    ]);
    const contract = srcRes.data.result?.[0] || {};
    let source = contract.SourceCode || '';
    if (source.startsWith('{{')) {
      try {
        const parsed = JSON.parse(source.slice(1, -1));
        const sources = parsed.sources || parsed;
        source = Object.values(sources).map(s => s.content || s).join('\n\n');
      } catch(e) {}
    }
    let abi = [];
    try { abi = JSON.parse(abiRes.data.result || '[]'); } catch(e) {}

    return res.json({
      name: contract.ContractName || 'Onbekend',
      source: source.substring(0, 100000),
      abi,
      compiler: contract.CompilerVersion || '',
      verified: !!source
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Cast call (lees functie aanroepen via Foundry cast)
app.post('/api/foundry/cast', (req, res) => {
  if (!authDash(req, res)) return;
  const { address, functionSig, args: callArgs } = req.body;
  const rpc = anvilProcess ? `http://127.0.0.1:${anvilPort}` : BSC_RPC;
  try {
    const argsStr = (callArgs || []).join(' ');
    const cmd = `"${CAST_PATH}" call ${address} "${functionSig}" ${argsStr} --rpc-url ${rpc}`;
    const output = execSync(cmd, { timeout: 15000, encoding: 'utf-8' });
    return res.json({ ok: true, result: output.trim() });
  } catch (err) {
    return res.json({ ok: false, error: (err.stdout || err.stderr || err.message).substring(0, 500) });
  }
});

// Run exploit script op Anvil fork
app.post('/api/foundry/run-exploit', (req, res) => {
  if (!authDash(req, res)) return;
  if (!anvilProcess) return res.status(400).json({ error: 'Start eerst een Anvil fork' });

  const { code, address } = req.body;
  if (!code) return res.status(400).json({ error: 'Code vereist' });

  const exploitFile = path.join(FOUNDRY_TMP, `exploit_${Date.now()}.js`);
  try {
    // Wrap de code zodat het standalone draait met ethers
    const wrappedCode = `
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:${anvilPort}');
const TARGET = '${address || anvilTarget || ''}';

async function main() {
  // Impersonate helper
  async function impersonate(addr) {
    await provider.send('anvil_impersonateAccount', [addr]);
    return new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  }
  async function setBalance(addr, amount) {
    await provider.send('anvil_setBalance', [addr, ethers.toQuantity(ethers.parseEther(amount))]);
  }
  async function fund(addr) {
    await setBalance(addr, '1000');
  }

${code}
}

main().then(() => { console.log('\\n=== EXPLOIT KLAAR ==='); process.exit(0); }).catch(e => { console.error('EXPLOIT FOUT:', e.message); process.exit(1); });
`;
    fs.writeFileSync(exploitFile, wrappedCode);

    const output = execSync(`node "${exploitFile}"`, {
      timeout: 120000,
      encoding: 'utf-8',
      env: { ...process.env, PATH: process.env.PATH + ';C:/Users/moham/.foundry/bin' }
    });

    // Cleanup
    try { fs.unlinkSync(exploitFile); } catch(e) {}

    return res.json({ ok: true, output: output.substring(0, 5000) });
  } catch (err) {
    try { fs.unlinkSync(exploitFile); } catch(e) {}
    const output = (err.stdout || '') + '\n' + (err.stderr || '');
    return res.json({ ok: false, output: output.substring(0, 5000), error: err.message });
  }
});

// AI exploit generatie
app.post('/api/foundry/ai-exploit', async (req, res) => {
  if (!authDash(req, res)) return;
  if (!CLAUDE_API_KEY) return res.status(400).json({ error: 'Geen Claude API key geconfigureerd' });

  const { address, source, abi } = req.body;
  if (!source) return res.status(400).json({ error: 'Contract source vereist' });

  try {
    const axios = require('axios');
    const trimmedSource = source.length > 30000 ? source.substring(0, 30000) + '\n// ... [TRUNCATED]' : source;

    const prompt = `Je bent een elite smart contract security auditor (bug bounty hunter). Analyseer dit BSC contract en genereer een exploit script.

Contract: ${address}
Chain: BSC (chainId 56)

\`\`\`solidity
${trimmedSource}
\`\`\`

Zoek naar BUSINESS LOGIC BUGS:
1. Rekenfouten, afrondingsbugs, fee exploits
2. Flash loan aanvallen (spot price als oracle)
3. Dubbel claimen, timing exploits, verkeerde bookkeeping
4. Cross-function state inconsistencies
5. Eerste depositor / donation attacks
6. Access control gaps (subtiel, niet simpel "missing onlyOwner")

Genereer een exploit in PUUR JavaScript (ethers.js v6). Het script krijgt automatisch:
- \`provider\` (JsonRpcProvider op Anvil fork)
- \`TARGET\` (contract adres)
- \`impersonate(addr)\` functie
- \`setBalance(addr, amount)\` functie
- \`fund(addr)\` functie

Antwoord in JSON:
{
  "analysis": "korte uitleg van gevonden bugs (max 5 bullets)",
  "exploitable": true/false,
  "confidence": "HIGH/MEDIUM/LOW",
  "exploit_code": "// alleen de body van main(), GEEN imports/wrapping"
}

Alleen echte bugs. Als niks gevonden: {"analysis":"Geen exploiteerbare bugs gevonden","exploitable":false,"confidence":"HIGH","exploit_code":null}`;

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      timeout: 60000
    });

    const aiText = response.data.content[0].text;
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.json({ ok: false, error: 'Geen JSON in AI response' });

    const result = JSON.parse(jsonMatch[0]);
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// === HEALTH CHECK ===
app.get('/health', (req, res) => res.json({ status: 'ok', results: scannerResults.length, exploits: exploitResults.length }));

// === DASHBOARD PAGE ===
app.get('/', (req, res) => {
  if (!authDash(req, res)) return;
  const key = req.query.key;

  res.send(`<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BSC Scanner Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0e17; color: #e0e6ed; min-height: 100vh; }

  .header { background: linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%); border-bottom: 1px solid #21262d; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
  .header h1 { font-size: 20px; font-weight: 600; }
  .header h1 span { color: #f0b429; }
  .clock { color: #8b949e; font-size: 13px; }

  .tabs { display: flex; gap: 0; padding: 0 24px; background: #0d1117; border-bottom: 1px solid #21262d; }
  .tab { padding: 12px 20px; font-size: 13px; font-weight: 600; color: #8b949e; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
  .tab:hover { color: #c9d1d9; }
  .tab.active { color: #58a6ff; border-bottom-color: #58a6ff; }

  .stats-bar { display: flex; gap: 16px; padding: 16px 24px; flex-wrap: wrap; }
  .stat-card { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 14px 20px; flex: 1; min-width: 140px; }
  .stat-card .label { font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; }
  .stat-card .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
  .stat-card .value.green { color: #3fb950; }
  .stat-card .value.red { color: #f85149; }
  .stat-card .value.gold { color: #f0b429; }
  .stat-card .value.blue { color: #58a6ff; }
  .stat-card .value.purple { color: #bc8cff; }

  .filters { padding: 8px 24px; display: flex; gap: 8px; flex-wrap: wrap; }
  .filter-btn { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
  .filter-btn:hover { background: #30363d; }
  .filter-btn.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }

  .table-wrap { padding: 8px 24px 24px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #161b22; border-bottom: 2px solid #21262d; padding: 10px 12px; text-align: left; cursor: pointer; user-select: none; white-space: nowrap; color: #8b949e; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
  th:hover { color: #58a6ff; }
  th .sort-arrow { margin-left: 4px; }
  td { padding: 10px 12px; border-bottom: 1px solid #21262d; }
  tr:hover td { background: #161b22; }

  .addr { font-family: 'Courier New', monospace; font-size: 12px; }
  .addr a { color: #58a6ff; text-decoration: none; }
  .addr a:hover { text-decoration: underline; }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge.danger { background: #f8514922; color: #f85149; border: 1px solid #f8514944; }
  .badge.warn { background: #d2992244; color: #f0b429; border: 1px solid #d2992266; }
  .badge.clean { background: #3fb95022; color: #3fb950; border: 1px solid #3fb95044; }
  .badge.exploit { background: #bc8cff22; color: #bc8cff; border: 1px solid #bc8cff44; animation: glow 2s infinite; }
  @keyframes glow { 0%, 100% { box-shadow: 0 0 4px #bc8cff44; } 50% { box-shadow: 0 0 12px #bc8cff66; } }

  .high-cell { color: #f85149; font-weight: 700; }
  .med-cell { color: #f0b429; font-weight: 600; }
  .balance { color: #3fb950; font-weight: 600; }

  .empty { text-align: center; padding: 60px; color: #484f58; font-size: 16px; }

  .refresh-bar { padding: 4px 24px; display: flex; justify-content: space-between; align-items: center; }
  .refresh-bar span { font-size: 11px; color: #484f58; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3fb950; margin-right: 6px; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .del-btn { background: none; border: 1px solid #f8514944; color: #f85149; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; opacity: 0.5; transition: all 0.2s; }
  .del-btn:hover { opacity: 1; background: #f8514922; }

  .panel { display: none; }
  .panel.active { display: block; }

  .exploit-card { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 16px; margin: 8px 24px; }
  .exploit-card.exploitable { border-color: #bc8cff44; }
  .exploit-card h3 { font-size: 14px; margin-bottom: 8px; }
  .exploit-card .detail { font-size: 12px; color: #8b949e; margin: 4px 0; }
  .exploit-card .detail span { color: #c9d1d9; }

  .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; overflow-y: auto; padding: 40px 20px; }
  .modal-overlay.active { display: flex; justify-content: center; align-items: flex-start; }
  .modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; max-width: 800px; width: 100%; padding: 24px; position: relative; }
  .modal-close { position: absolute; top: 12px; right: 16px; background: none; border: none; color: #8b949e; font-size: 20px; cursor: pointer; }
  .modal-close:hover { color: #f85149; }
  .modal h2 { font-size: 16px; margin-bottom: 4px; }
  .modal .modal-addr { font-family: 'Courier New', monospace; font-size: 12px; color: #58a6ff; margin-bottom: 16px; }
  .modal .modal-addr a { color: #58a6ff; text-decoration: none; }
  .modal .modal-addr a:hover { text-decoration: underline; }
  .modal-meta { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .modal-meta .mm { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 8px 14px; font-size: 12px; }
  .modal-meta .mm .ml { color: #8b949e; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .modal-meta .mm .mv { font-weight: 700; margin-top: 2px; }
  .modal-section { margin-bottom: 16px; }
  .modal-section h3 { font-size: 13px; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #21262d; }
  .finding-row { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; border-bottom: 1px solid #161b2288; font-size: 12px; }
  .finding-row .f-sev { flex-shrink: 0; width: 18px; text-align: center; }
  .finding-row .f-name { color: #c9d1d9; font-weight: 600; min-width: 120px; }
  .finding-row .f-desc { color: #8b949e; flex: 1; }
  .no-findings { color: #3fb950; font-size: 12px; padding: 8px 0; }
  tr.clickable { cursor: pointer; }
  tr.clickable:hover td { background: #1c2333; }
</style>
</head>
<body>

<div class="header">
  <h1><span>BSC Scanner</span> Dashboard</h1>
  <div class="clock" id="clock"></div>
</div>

<div class="tabs">
  <div class="tab active" onclick="switchTab('contracts')">Contracten</div>
  <div class="tab" onclick="switchTab('slither')">Slither</div>
  <div class="tab" onclick="switchTab('mythril')">Mythril</div>
  <div class="tab" onclick="switchTab('echidna')">Echidna</div>
  <div class="tab" onclick="switchTab('exploits')">Exploit Tests</div>
  <div class="tab" onclick="switchTab('foundry')" style="color:#f0b429">⚡ Foundry Lab</div>
</div>

<div class="panel active" id="panel-contracts">
  <div class="stats-bar">
    <div class="stat-card"><div class="label">Gescand</div><div class="value blue" id="s-total">-</div></div>
    <div class="stat-card"><div class="label">High Issues</div><div class="value red" id="s-high">-</div></div>
    <div class="stat-card"><div class="label">Exploitable</div><div class="value purple" id="s-exploit">-</div></div>
    <div class="stat-card"><div class="label">Totale Balance</div><div class="value gold" id="s-balance">-</div></div>
    <div class="stat-card"><div class="label">Schoon</div><div class="value green" id="s-clean">-</div></div>
  </div>

  <div class="filters">
    <button class="filter-btn active" onclick="setFilter('all')">Alle</button>
    <button class="filter-btn" onclick="setFilter('high')">Alleen High</button>
    <button class="filter-btn" onclick="setFilter('50k')">$50k+</button>
    <button class="filter-btn" onclick="setFilter('danger')">Gevaarlijk</button>
    <button class="filter-btn" onclick="setFilter('exploitable')">Exploitable</button>
  </div>

  <div class="refresh-bar">
    <span><span class="dot"></span>Auto-refresh elke 30s</span>
    <span id="last-update">Laden...</span>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th onclick="sortBy('time')">Datum <span class="sort-arrow" id="sort-time"></span></th>
          <th onclick="sortBy('contractName')">Naam <span class="sort-arrow" id="sort-contractName"></span></th>
          <th onclick="sortBy('address')">Contract <span class="sort-arrow" id="sort-address"></span></th>
          <th onclick="sortBy('balanceUsd')">Balance <span class="sort-arrow" id="sort-balanceUsd"></span></th>
          <th onclick="sortBy('totalHigh')">High <span class="sort-arrow" id="sort-totalHigh"></span></th>
          <th onclick="sortBy('totalMedium')">Medium <span class="sort-arrow" id="sort-totalMedium"></span></th>
          <th onclick="sortBy('verdict')">Verdict <span class="sort-arrow" id="sort-verdict"></span></th>
          <th>Actie</th>
        </tr>
      </thead>
      <tbody id="results-body">
        <tr><td colspan="8" class="empty">Laden...</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="panel" id="panel-slither">
  <div class="stats-bar">
    <div class="stat-card"><div class="label">Geanalyseerd</div><div class="value blue" id="sl-total">-</div></div>
    <div class="stat-card"><div class="label">High Findings</div><div class="value red" id="sl-high">-</div></div>
    <div class="stat-card"><div class="label">Medium Findings</div><div class="value gold" id="sl-med">-</div></div>
    <div class="stat-card"><div class="label">Schoon</div><div class="value green" id="sl-clean">-</div></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Datum</th>
          <th>Contract</th>
          <th>Adres</th>
          <th>High</th>
          <th>Medium</th>
          <th>Top Findings</th>
        </tr>
      </thead>
      <tbody id="slither-body">
        <tr><td colspan="6" class="empty">Laden...</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="panel" id="panel-mythril">
  <div class="stats-bar">
    <div class="stat-card"><div class="label">Geanalyseerd</div><div class="value blue" id="my-total">-</div></div>
    <div class="stat-card"><div class="label">High Issues</div><div class="value red" id="my-high">-</div></div>
    <div class="stat-card"><div class="label">Medium Issues</div><div class="value gold" id="my-med">-</div></div>
    <div class="stat-card"><div class="label">Schoon</div><div class="value green" id="my-clean">-</div></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Datum</th>
          <th>Contract</th>
          <th>Adres</th>
          <th>High</th>
          <th>Medium</th>
          <th>Top Issues</th>
        </tr>
      </thead>
      <tbody id="mythril-body">
        <tr><td colspan="6" class="empty">Laden...</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="panel" id="panel-exploits">
  <div class="stats-bar">
    <div class="stat-card"><div class="label">Totaal Getest</div><div class="value blue" id="se-total">-</div></div>
    <div class="stat-card"><div class="label">Exploitable</div><div class="value purple" id="se-exploit">-</div></div>
    <div class="stat-card"><div class="label">Niet Exploitable</div><div class="value green" id="se-safe">-</div></div>
  </div>
  <div id="exploits-list"></div>
</div>

<div class="panel" id="panel-echidna">
  <div class="stats-bar">
    <div class="stat-card"><div class="label">Totaal Gefuzzed</div><div class="value blue" id="sf-total">-</div></div>
    <div class="stat-card"><div class="label">Failures Gevonden</div><div class="value red" id="sf-failed">-</div></div>
    <div class="stat-card"><div class="label">Alle Tests Passed</div><div class="value green" id="sf-clean">-</div></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Datum</th>
          <th>Contract</th>
          <th>Adres</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>Status</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody id="echidna-body">
        <tr><td colspan="7" class="empty">Geen echidna resultaten</td></tr>
      </tbody>
    </table>
  </div>
</div>

<div class="panel" id="panel-foundry">
  <div class="stats-bar">
    <div class="stat-card"><div class="label">Anvil Status</div><div class="value" id="fl-status" style="color:#f85149">OFFLINE</div></div>
    <div class="stat-card"><div class="label">Target</div><div class="value blue" id="fl-target" style="font-size:14px">-</div></div>
    <div class="stat-card"><div class="label">RPC</div><div class="value" id="fl-rpc" style="font-size:14px;color:#8b949e">-</div></div>
  </div>

  <div style="padding:16px 24px;display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
    <div style="flex:1;min-width:300px">
      <label style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px">Contract Adres</label>
      <input id="fl-address" type="text" placeholder="0x..." style="width:100%;background:#0d1117;border:1px solid #30363d;color:#c9d1d9;padding:10px 14px;border-radius:8px;font-family:monospace;font-size:14px;margin-top:4px">
    </div>
    <button onclick="startFork()" style="background:#1f6feb;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap">Start Fork</button>
    <button onclick="stopFork()" style="background:#21262d;color:#f85149;border:1px solid #f8514944;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px">Stop</button>
    <button onclick="loadContract()" style="background:#21262d;color:#58a6ff;border:1px solid #58a6ff44;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px">Laad Source</button>
    <button onclick="aiExploit()" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px">AI Exploit</button>
  </div>

  <div style="padding:0 24px 8px;display:flex;gap:16px">
    <div style="flex:1;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <label style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px">Exploit Code (JavaScript / ethers v6)</label>
        <button onclick="runExploit()" style="background:#3fb950;color:#0a0e17;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px">▶ RUN</button>
      </div>
      <textarea id="fl-code" spellcheck="false" style="width:100%;height:400px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:12px;border-radius:8px;font-family:'Courier New',monospace;font-size:13px;line-height:1.5;resize:vertical;tab-size:2">// Beschikbaar: provider, TARGET, impersonate(addr), setBalance(addr, eth), fund(addr)
// Voorbeeld:

const abi = ['function owner() view returns (address)', 'function balanceOf(address) view returns (uint256)'];
const contract = new ethers.Contract(TARGET, abi, provider);

const owner = await contract.owner();
console.log('Owner:', owner);

// Impersonate de owner
await impersonate(owner);
await fund(owner);
const signer = await provider.getSigner(owner);

// Doe iets als owner...
console.log('Geimpersoneerd als owner');</textarea>
    </div>
  </div>

  <div style="padding:0 24px 8px">
    <label style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px">AI Analyse</label>
    <div id="fl-analysis" style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;font-size:13px;color:#8b949e;min-height:60px;margin-top:4px;white-space:pre-wrap">Nog geen analyse uitgevoerd</div>
  </div>

  <div style="padding:0 24px 24px">
    <label style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px">Output</label>
    <pre id="fl-output" style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;font-family:'Courier New',monospace;font-size:12px;color:#3fb950;min-height:150px;max-height:400px;overflow-y:auto;margin-top:4px;white-space:pre-wrap">Wacht op exploit run...</pre>
  </div>

  <div style="padding:0 24px 16px">
    <label style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px">Contract Source</label>
    <pre id="fl-source" style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;font-family:'Courier New',monospace;font-size:11px;color:#8b949e;max-height:300px;overflow-y:auto;margin-top:4px;white-space:pre-wrap">Klik 'Laad Source' om contract code te laden</pre>
  </div>
</div>

<script>
const KEY = '${key}';
let data = [];
let exploits = [];
let echidnaData = [];
let currentSort = 'totalHigh';
let sortDir = -1;
let currentFilter = 'all';

function shortAddr(a) { return a ? a.slice(0,6) + '...' + a.slice(-4) : ''; }
function fmtBalance(v) { return v >= 1000000 ? '$' + (v/1000000).toFixed(1) + 'M' : v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + (v||0).toFixed(0); }
function fmtDate(t) { if (!t) return '-'; const d = new Date(t); return d.toLocaleDateString('nl-NL',{day:'2-digit',month:'2-digit'}) + ' ' + d.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}); }

function getVerdict(r) {
  if (r.exploitResult?.exploitable) return { text: 'EXPLOITABLE', cls: 'exploit', score: 4 };
  if (r.totalHigh >= 3) return { text: 'GEVAARLIJK', cls: 'danger', score: 3 };
  if (r.totalHigh >= 1) return { text: 'VERDACHT', cls: 'warn', score: 2 };
  return { text: 'SCHOON', cls: 'clean', score: 1 };
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  render();
}

function sortBy(col) {
  if (currentSort === col) sortDir *= -1;
  else { currentSort = col; sortDir = -1; }
  render();
}

async function deleteResult(addr) {
  if (!confirm('Verwijder dit contract?')) return;
  await fetch('/api/scanner/results/' + addr + '?key=' + KEY, { method: 'DELETE' });
  await fetchData();
}

function render() {
  let filtered = [...data];
  if (currentFilter === 'high') filtered = filtered.filter(r => r.totalHigh > 0);
  else if (currentFilter === '50k') filtered = filtered.filter(r => r.balanceUsd >= 50000);
  else if (currentFilter === 'danger') filtered = filtered.filter(r => r.totalHigh >= 3);
  else if (currentFilter === 'exploitable') filtered = filtered.filter(r => r.exploitResult?.exploitable);

  filtered.sort((a, b) => {
    let va, vb;
    if (currentSort === 'verdict') { va = getVerdict(a).score; vb = getVerdict(b).score; }
    else if (currentSort === 'time') { va = new Date(a.time||0).getTime(); vb = new Date(b.time||0).getTime(); }
    else { va = a[currentSort] || 0; vb = b[currentSort] || 0; }
    if (typeof va === 'string') return sortDir * va.localeCompare(vb);
    return sortDir * (va - vb);
  });

  document.querySelectorAll('.sort-arrow').forEach(s => s.textContent = '');
  const arrow = document.getElementById('sort-' + currentSort);
  if (arrow) arrow.textContent = sortDir === -1 ? '▼' : '▲';

  document.getElementById('s-total').textContent = data.length;
  document.getElementById('s-high').textContent = data.filter(r => r.totalHigh > 0).length;
  document.getElementById('s-exploit').textContent = data.filter(r => r.exploitResult?.exploitable).length;
  document.getElementById('s-balance').textContent = fmtBalance(data.reduce((s, r) => s + (r.balanceUsd || 0), 0));
  document.getElementById('s-clean').textContent = data.filter(r => !r.totalHigh).length;

  const tbody = document.getElementById('results-body');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">Geen resultaten' + (currentFilter !== 'all' ? ' (filter actief)' : '') + '</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(r => {
    const v = getVerdict(r);
    return '<tr class="clickable" onclick="showDetail(\\''+r.address+'\\')">' +
      '<td>' + fmtDate(r.time) + '</td>' +
      '<td>' + (r.contractName || '-') + '</td>' +
      '<td class="addr">' + shortAddr(r.address) + '</td>' +
      '<td class="balance">' + fmtBalance(r.balanceUsd) + '</td>' +
      '<td class="high-cell">' + (r.totalHigh || 0) + '</td>' +
      '<td class="med-cell">' + (r.totalMedium || 0) + '</td>' +
      '<td><span class="badge ' + v.cls + '">' + v.text + '</span></td>' +
      '<td><button class="del-btn" onclick="event.stopPropagation();deleteResult(\\''+r.address+'\\')">X</button></td>' +
      '</tr>';
  }).join('');
}

function renderSlither() {
  const withSlither = data.filter(r => r.slither?.success);
  const totalHigh = withSlither.reduce((s, r) => s + (r.slither?.high || 0), 0);
  const totalMed = withSlither.reduce((s, r) => s + (r.slither?.medium || 0), 0);
  const clean = withSlither.filter(r => !r.slither?.high && !r.slither?.medium).length;

  document.getElementById('sl-total').textContent = withSlither.length;
  document.getElementById('sl-high').textContent = totalHigh;
  document.getElementById('sl-med').textContent = totalMed;
  document.getElementById('sl-clean').textContent = clean;

  const tbody = document.getElementById('slither-body');
  if (withSlither.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Geen slither resultaten</td></tr>';
    return;
  }

  const sorted = [...withSlither].sort((a, b) => (b.slither?.high || 0) - (a.slither?.high || 0));
  tbody.innerHTML = sorted.map(r => {
    const findings = (r.slither?.findings || []).slice(0, 3).map(f => {
      const icon = f.impact === 'High' ? '<span style="color:#f85149">H</span>' : '<span style="color:#f0b429">M</span>';
      return icon + ' ' + (f.check || f.description || '').substring(0, 40);
    }).join('<br>');
    return '<tr>' +
      '<td>' + fmtDate(r.time) + '</td>' +
      '<td>' + (r.contractName || '-') + '</td>' +
      '<td class="addr"><a href="https://bscscan.com/address/' + r.address + '" target="_blank">' + shortAddr(r.address) + '</a></td>' +
      '<td class="high-cell">' + (r.slither?.high || 0) + '</td>' +
      '<td class="med-cell">' + (r.slither?.medium || 0) + '</td>' +
      '<td style="font-size:11px;line-height:1.6">' + (findings || '<span style="color:#3fb950">Schoon</span>') + '</td>' +
      '</tr>';
  }).join('');
}

function renderMythril() {
  const withMythril = data.filter(r => r.mythril?.success);
  const totalHigh = withMythril.reduce((s, r) => s + (r.mythril?.high || 0), 0);
  const totalMed = withMythril.reduce((s, r) => s + (r.mythril?.medium || 0), 0);
  const clean = withMythril.filter(r => !r.mythril?.high && !r.mythril?.medium).length;

  document.getElementById('my-total').textContent = withMythril.length;
  document.getElementById('my-high').textContent = totalHigh;
  document.getElementById('my-med').textContent = totalMed;
  document.getElementById('my-clean').textContent = clean;

  const tbody = document.getElementById('mythril-body');
  if (withMythril.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Geen mythril resultaten</td></tr>';
    return;
  }

  const sorted = [...withMythril].sort((a, b) => (b.mythril?.high || 0) - (a.mythril?.high || 0));
  tbody.innerHTML = sorted.map(r => {
    const issues = (r.mythril?.issues || []).slice(0, 3).map(i => {
      const icon = i.severity === 'High' ? '<span style="color:#f85149">H</span>' : '<span style="color:#f0b429">M</span>';
      const swc = i.swcId ? ' (SWC-' + i.swcId + ')' : '';
      return icon + ' ' + (i.title || '').substring(0, 40) + swc;
    }).join('<br>');
    return '<tr>' +
      '<td>' + fmtDate(r.time) + '</td>' +
      '<td>' + (r.contractName || '-') + '</td>' +
      '<td class="addr"><a href="https://bscscan.com/address/' + r.address + '" target="_blank">' + shortAddr(r.address) + '</a></td>' +
      '<td class="high-cell">' + (r.mythril?.high || 0) + '</td>' +
      '<td class="med-cell">' + (r.mythril?.medium || 0) + '</td>' +
      '<td style="font-size:11px;line-height:1.6">' + (issues || '<span style="color:#3fb950">Schoon</span>') + '</td>' +
      '</tr>';
  }).join('');
}

function renderExploits() {
  document.getElementById('se-total').textContent = exploits.length;
  document.getElementById('se-exploit').textContent = exploits.filter(e => e.exploitable).length;
  document.getElementById('se-safe').textContent = exploits.filter(e => !e.exploitable).length;

  const list = document.getElementById('exploits-list');
  if (exploits.length === 0) {
    list.innerHTML = '<div class="empty">Geen exploit tests</div>';
    return;
  }
  list.innerHTML = exploits.slice(0, 50).map(e => {
    return '<div class="exploit-card ' + (e.exploitable ? 'exploitable' : '') + '">' +
      '<h3><span class="badge ' + (e.exploitable ? 'exploit' : 'clean') + '">' + (e.exploitable ? 'EXPLOITABLE' : 'VEILIG') + '</span> ' + (e.contractName || shortAddr(e.address)) + '</h3>' +
      '<div class="detail">Adres: <span><a href="https://bscscan.com/address/' + e.address + '" target="_blank" style="color:#58a6ff">' + (e.address || '-') + '</a></span></div>' +
      '<div class="detail">Getest: <span>' + fmtDate(e.time) + '</span></div>' +
      (e.method ? '<div class="detail">Methode: <span>' + e.method + '</span></div>' : '') +
      (e.details ? '<div class="detail">Details: <span>' + e.details + '</span></div>' : '') +
      '</div>';
  }).join('');
}

function renderEchidna() {
  const total = echidnaData.length;
  const withFails = echidnaData.filter(e => e.failed > 0).length;
  const clean = echidnaData.filter(e => e.failed === 0 && e.passed > 0).length;

  document.getElementById('sf-total').textContent = total;
  document.getElementById('sf-failed').textContent = withFails;
  document.getElementById('sf-clean').textContent = clean;

  const tbody = document.getElementById('echidna-body');
  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Geen echidna resultaten</td></tr>';
    return;
  }

  tbody.innerHTML = echidnaData.slice(0, 100).map(e => {
    const hasFails = e.failed > 0;
    const statusBadge = hasFails
      ? '<span class="badge danger">FAILURES</span>'
      : (e.passed > 0 ? '<span class="badge clean">PASSED</span>' : '<span class="badge warn">GEEN DATA</span>');
    const details = (e.issues || []).slice(0, 3).map(i => i.detail || i.type).join(', ');
    return '<tr>' +
      '<td>' + fmtDate(e.time) + '</td>' +
      '<td>' + (e.contractName || '-') + '</td>' +
      '<td class="addr"><a href="https://bscscan.com/address/' + e.address + '" target="_blank">' + shortAddr(e.address) + '</a></td>' +
      '<td style="color:#3fb950;font-weight:600">' + (e.passed || 0) + '</td>' +
      '<td class="high-cell">' + (e.failed || 0) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="font-size:11px;color:#8b949e;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (details || '-') + '</td>' +
      '</tr>';
  }).join('');
}

async function fetchData() {
  try {
    const [resR, resE, resF] = await Promise.all([
      fetch('/api/scanner/results?key=' + KEY),
      fetch('/api/scanner/exploit?key=' + KEY),
      fetch('/api/scanner/echidna?key=' + KEY)
    ]);
    data = await resR.json();
    exploits = await resE.json();
    echidnaData = await resF.json();
    render();
    renderSlither();
    renderMythril();
    renderExploits();
    renderEchidna();
    document.getElementById('last-update').textContent = 'Laatste update: ' + new Date().toLocaleTimeString('nl-NL');
  } catch (e) {
    document.getElementById('last-update').textContent = 'Fout bij laden';
  }
}

function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

fetchData();
setInterval(fetchData, 30000);
setInterval(updateClock, 1000);
updateClock();

function showDetail(addr) {
  const r = data.find(d => d.address === addr);
  if (!r) return;
  const v = getVerdict(r);
  const m = document.getElementById('modal-content');

  let html = '<h2>' + (r.contractName || 'Onbekend') + ' <span class="badge ' + v.cls + '">' + v.text + '</span></h2>';
  html += '<div class="modal-addr"><a href="https://bscscan.com/address/' + r.address + '" target="_blank">' + r.address + '</a></div>';

  html += '<div class="modal-meta">';
  html += '<div class="mm"><div class="ml">Balance</div><div class="mv" style="color:#3fb950">' + fmtBalance(r.balanceUsd) + '</div></div>';
  html += '<div class="mm"><div class="ml">High</div><div class="mv" style="color:#f85149">' + (r.totalHigh || 0) + '</div></div>';
  html += '<div class="mm"><div class="ml">Medium</div><div class="mv" style="color:#f0b429">' + (r.totalMedium || 0) + '</div></div>';
  html += '<div class="mm"><div class="ml">Datum</div><div class="mv">' + fmtDate(r.time) + '</div></div>';
  html += '</div>';

  // Slither
  html += '<div class="modal-section"><h3>Slither (Statische Analyse)</h3>';
  if (r.slither?.success && r.slither.findings?.length > 0) {
    r.slither.findings.forEach(f => {
      const icon = f.impact === 'High' ? '<span style="color:#f85149">H</span>' : '<span style="color:#f0b429">M</span>';
      html += '<div class="finding-row"><div class="f-sev">' + icon + '</div><div class="f-name">' + (f.check || '-') + '</div><div class="f-desc">' + (f.description || '').substring(0, 300) + '</div></div>';
    });
  } else if (r.slither?.success) {
    html += '<div class="no-findings">Geen high/medium findings</div>';
  } else {
    html += '<div style="color:#8b949e;font-size:12px">Niet beschikbaar</div>';
  }
  html += '</div>';

  // Mythril
  html += '<div class="modal-section"><h3>Mythril (Symbolische Executie)</h3>';
  if (r.mythril?.success && r.mythril.issues?.length > 0) {
    r.mythril.issues.forEach(i => {
      const icon = i.severity === 'High' ? '<span style="color:#f85149">H</span>' : '<span style="color:#f0b429">M</span>';
      const swc = i.swcId ? ' (SWC-' + i.swcId + ')' : '';
      html += '<div class="finding-row"><div class="f-sev">' + icon + '</div><div class="f-name">' + (i.title || '-') + swc + '</div><div class="f-desc">' + (i.function || '') + '</div></div>';
    });
  } else if (r.mythril?.success) {
    html += '<div class="no-findings">Geen high/medium issues</div>';
  } else {
    html += '<div style="color:#8b949e;font-size:12px">Niet beschikbaar</div>';
  }
  html += '</div>';

  // Security
  html += '<div class="modal-section"><h3>Security Check (On-Chain)</h3>';
  if (r.security?.success && r.security.findings?.length > 0) {
    r.security.findings.forEach(f => {
      const color = f.severity === 'HIGH' ? '#f85149' : f.severity === 'MEDIUM' ? '#f0b429' : '#8b949e';
      html += '<div class="finding-row"><div class="f-sev"><span style="color:' + color + '">' + (f.severity || '?')[0] + '</span></div><div class="f-name">' + (f.check || '-') + '</div><div class="f-desc">' + (f.detail || '') + '</div></div>';
    });
  } else if (r.security?.success) {
    html += '<div class="no-findings">Geen issues gevonden</div>';
  } else {
    html += '<div style="color:#8b949e;font-size:12px">Niet beschikbaar</div>';
  }
  html += '</div>';

  // Echidna
  html += '<div class="modal-section"><h3>Echidna (Fuzzing)</h3>';
  if (r.echidna?.success !== undefined && r.echidna?.passed !== undefined) {
    html += '<div style="font-size:12px;margin-bottom:6px">Passed: <span style="color:#3fb950;font-weight:600">' + (r.echidna.passed || 0) + '</span> | Failed: <span style="color:#f85149;font-weight:600">' + (r.echidna.failed || 0) + '</span></div>';
    if (r.echidna.issues?.length > 0) {
      r.echidna.issues.forEach(i => {
        html += '<div class="finding-row"><div class="f-sev"><span style="color:#f85149">!</span></div><div class="f-name">' + (i.type || '-') + '</div><div class="f-desc">' + (i.detail || '').substring(0, 300) + '</div></div>';
      });
    }
  } else {
    html += '<div style="color:#8b949e;font-size:12px">Niet beschikbaar</div>';
  }
  html += '</div>';

  m.innerHTML = html;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// === FOUNDRY LAB FUNCTIONS ===
async function checkAnvilStatus() {
  try {
    const r = await fetch('/api/foundry/status?key=' + KEY);
    const s = await r.json();
    document.getElementById('fl-status').textContent = s.running ? 'ONLINE' : 'OFFLINE';
    document.getElementById('fl-status').style.color = s.running ? '#3fb950' : '#f85149';
    document.getElementById('fl-target').textContent = s.address ? shortAddr(s.address) : '-';
    document.getElementById('fl-rpc').textContent = s.running ? 'http://127.0.0.1:' + s.port : '-';
  } catch(e) {}
}

async function startFork() {
  const addr = document.getElementById('fl-address').value.trim();
  if (!addr) return alert('Vul een contract adres in');
  document.getElementById('fl-status').textContent = 'STARTING...';
  document.getElementById('fl-status').style.color = '#f0b429';
  document.getElementById('fl-output').textContent = 'Anvil fork starten...';
  try {
    const r = await fetch('/api/foundry/fork?key=' + KEY, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ address: addr })
    });
    const d = await r.json();
    if (d.ok) {
      document.getElementById('fl-output').textContent = 'Anvil fork gestart op ' + d.rpc + '\\nTarget: ' + d.address + '\\n\\nKlaar voor exploit testing!';
      checkAnvilStatus();
    } else {
      document.getElementById('fl-output').textContent = 'FOUT: ' + (d.error || 'Onbekend');
      document.getElementById('fl-status').textContent = 'FOUT';
      document.getElementById('fl-status').style.color = '#f85149';
    }
  } catch(e) {
    document.getElementById('fl-output').textContent = 'FOUT: ' + e.message;
  }
}

async function stopFork() {
  await fetch('/api/foundry/stop?key=' + KEY, { method: 'POST' });
  document.getElementById('fl-output').textContent = 'Anvil fork gestopt.';
  checkAnvilStatus();
}

async function loadContract() {
  const addr = document.getElementById('fl-address').value.trim();
  if (!addr) return alert('Vul een contract adres in');
  document.getElementById('fl-source').textContent = 'Laden...';
  try {
    const r = await fetch('/api/foundry/contract/' + addr + '?key=' + KEY);
    const d = await r.json();
    if (d.source) {
      document.getElementById('fl-source').textContent = '// ' + d.name + ' (Compiler: ' + d.compiler + ')\\n// Verified: ' + d.verified + '\\n\\n' + d.source.substring(0, 50000);
    } else {
      document.getElementById('fl-source').textContent = 'Geen verified source gevonden voor ' + addr;
    }
  } catch(e) {
    document.getElementById('fl-source').textContent = 'FOUT: ' + e.message;
  }
}

async function runExploit() {
  const code = document.getElementById('fl-code').value;
  const addr = document.getElementById('fl-address').value.trim();
  if (!code.trim()) return alert('Schrijf eerst exploit code');

  document.getElementById('fl-output').textContent = 'Exploit uitvoeren...';
  document.getElementById('fl-output').style.color = '#f0b429';
  try {
    const r = await fetch('/api/foundry/run-exploit?key=' + KEY, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ code, address: addr })
    });
    const d = await r.json();
    document.getElementById('fl-output').style.color = d.ok ? '#3fb950' : '#f85149';
    document.getElementById('fl-output').textContent = d.output || d.error || 'Geen output';
  } catch(e) {
    document.getElementById('fl-output').style.color = '#f85149';
    document.getElementById('fl-output').textContent = 'FOUT: ' + e.message;
  }
}

async function aiExploit() {
  const addr = document.getElementById('fl-address').value.trim();
  const source = document.getElementById('fl-source').textContent;
  if (!addr) return alert('Vul een contract adres in');
  if (!source || source.includes('Klik') || source.includes('Laden')) return alert('Laad eerst de contract source');

  document.getElementById('fl-analysis').textContent = 'AI analyseert contract...';
  document.getElementById('fl-analysis').style.color = '#f0b429';
  try {
    const r = await fetch('/api/foundry/ai-exploit?key=' + KEY, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ address: addr, source })
    });
    const d = await r.json();
    if (d.ok !== false) {
      const conf = d.confidence === 'HIGH' ? '\\u{1f534}' : d.confidence === 'MEDIUM' ? '\\u{1f7e1}' : '\\u26aa';
      document.getElementById('fl-analysis').style.color = d.exploitable ? '#f85149' : '#3fb950';
      document.getElementById('fl-analysis').textContent = conf + ' Confidence: ' + (d.confidence || '?') + '\\nExploitable: ' + (d.exploitable ? 'JA' : 'NEE') + '\\n\\n' + (d.analysis || 'Geen findings');
      if (d.exploit_code) {
        document.getElementById('fl-code').value = d.exploit_code;
      }
    } else {
      document.getElementById('fl-analysis').style.color = '#f85149';
      document.getElementById('fl-analysis').textContent = 'FOUT: ' + (d.error || 'Onbekend');
    }
  } catch(e) {
    document.getElementById('fl-analysis').style.color = '#f85149';
    document.getElementById('fl-analysis').textContent = 'FOUT: ' + e.message;
  }
}

// Tab support voor code editor
document.getElementById('fl-code').addEventListener('keydown', function(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = this.selectionStart;
    this.value = this.value.substring(0, start) + '  ' + this.value.substring(this.selectionEnd);
    this.selectionStart = this.selectionEnd = start + 2;
  }
});

// Check anvil status periodiek
setInterval(checkAnvilStatus, 10000);
checkAnvilStatus();
</script>

<div class="modal-overlay" id="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <button class="modal-close" onclick="closeModal()">X</button>
    <div id="modal-content"></div>
  </div>
</div>

</body>
</html>`);
});

// === ROOT HEALTH (zonder auth) ===
app.get('/ping', (req, res) => res.send('ok'));

// === START ===
app.listen(PORT, () => {
  console.log('BSC Scanner Dashboard draait op port ' + PORT);
  console.log('Resultaten: ' + scannerResults.length + ', Exploits: ' + exploitResults.length);
});
