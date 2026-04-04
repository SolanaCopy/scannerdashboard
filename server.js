require('dotenv').config();
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
const BSC_RPC = 'https://bsc-dataseed1.binance.org';
const BSCSCAN_KEY = process.env.BSCSCAN_API_KEY || 'P3RD5KVMAP39CB25HM97THVDXHVDCNEUIX';
const CLAUDE_API_KEY = process.env.CLAUDE_KEY || process.env.CLAUDE_API_KEY || '';
let anvilProcess = null;
let anvilPort = 8545;
let anvilTarget = null;
const FOUNDRY_TMP = path.join(__dirname, 'tmp_foundry');
if (!fs.existsSync(FOUNDRY_TMP)) fs.mkdirSync(FOUNDRY_TMP, { recursive: true });

// Helper: kill alles op een port
function killPort(port) {
  try {
    const out = execSync('netstat -ano | findstr LISTENING | findstr :' + port, { encoding: 'utf-8', timeout: 5000 });
    const lines = out.trim().split('\n');
    for (const line of lines) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== '0') {
        try { execSync('taskkill /F /PID ' + pid, { timeout: 5000 }); } catch(e) {}
      }
    }
  } catch(e) {}
}

// Start verse Anvil fork (altijd nieuw — voorkomt stale state)
function startAnvil(address, blockNumber) {
  return new Promise((resolve, reject) => {
    // Kill alles op de port
    if (anvilProcess) { try { anvilProcess.kill(); } catch(e) {} anvilProcess = null; }
    killPort(anvilPort);

    const args = ['--fork-url', BSC_RPC, '--port', String(anvilPort), '--chain-id', '56', '--auto-impersonate'];
    if (blockNumber) args.push('--fork-block-number', String(blockNumber));

    // Kleine delay na kill
    setTimeout(() => {
      try {
        anvilProcess = spawn(ANVIL_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        anvilTarget = address;
        let done = false;

        const onData = (d) => {
          const out = d.toString();
          if (out.includes('Listening on') && !done) {
            done = true;
            resolve({ ok: true, port: anvilPort, address, rpc: 'http://127.0.0.1:' + anvilPort });
          }
        };
        anvilProcess.stdout.on('data', onData);
        anvilProcess.stderr.on('data', onData);
        anvilProcess.on('error', (err) => { if (!done) { done = true; reject(err); } });
        anvilProcess.on('exit', () => { anvilProcess = null; anvilTarget = null; });

        setTimeout(() => {
          if (!done) { done = true; try { anvilProcess.kill(); } catch(e) {} reject(new Error('Anvil timeout (30s) — RPC mogelijk traag, probeer opnieuw')); }
        }, 30000);
      } catch(err) { reject(err); }
    }, 1000);
  });
}

// Start Anvil fork
app.post('/api/foundry/fork', async (req, res) => {
  if (!authDash(req, res)) return;
  const { address, blockNumber } = req.body;
  if (!address) return res.status(400).json({ error: 'Address vereist' });

  try {
    const result = await startAnvil(address, blockNumber);
    return res.json(result);
  } catch(err) {
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
app.get('/api/foundry/status', async (req, res) => {
  if (!authDash(req, res)) return;
  // Check of Anvil echt draait (ook als het niet via ons gestart is)
  let running = !!anvilProcess;
  if (!running) {
    try {
      const http = require('http');
      const check = await new Promise((resolve) => {
        const r = http.request({ hostname: '127.0.0.1', port: anvilPort, method: 'POST', headers: {'Content-Type':'application/json'}, timeout: 2000 }, (resp) => {
          let d = ''; resp.on('data', c => d += c); resp.on('end', () => resolve(d));
        });
        r.on('error', () => resolve(null));
        r.on('timeout', () => { r.destroy(); resolve(null); });
        r.write('{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}');
        r.end();
      });
      running = !!(check && check.includes('result'));
    } catch(e) {}
  }
  return res.json({ running, address: anvilTarget, port: anvilPort });
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
app.post('/api/foundry/run-exploit', async (req, res) => {
  if (!authDash(req, res)) return;
  // Check of Anvil draait (via process OF extern)
  let anvilRunning = !!anvilProcess;
  if (!anvilRunning) {
    try {
      const http = require('http');
      const check = await new Promise((resolve) => {
        const r = http.request({ hostname: '127.0.0.1', port: anvilPort, method: 'POST', headers: {'Content-Type':'application/json'}, timeout: 2000 }, (resp) => {
          let d = ''; resp.on('data', c => d += c); resp.on('end', () => resolve(d));
        });
        r.on('error', () => resolve(null));
        r.on('timeout', () => { r.destroy(); resolve(null); });
        r.write('{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}');
        r.end();
      });
      anvilRunning = !!(check && check.includes('result'));
    } catch(e) {}
  }
  if (!anvilRunning) return res.status(400).json({ error: 'Start eerst een Anvil fork' });

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

    // Auto-restart bij stale fork
    if (output.includes('missing trie node') || output.includes('header not found')) {
      try {
        console.log('[FOUNDRY] Stale fork detected, restarting Anvil...');
        await startAnvil(address || anvilTarget, null);
        return res.json({ ok: false, output: 'Fork was verouderd — automatisch herstart. Klik opnieuw op RUN.', autoRestarted: true });
      } catch(e) {
        return res.json({ ok: false, output: output.substring(0, 5000), error: 'Fork verouderd + herstart mislukt: ' + e.message });
      }
    }

    return res.json({ ok: false, output: output.substring(0, 5000), error: err.message });
  }
});

// Helper: haal on-chain info op via cast
function castCall(address, sig, rpc) {
  try {
    return execSync(`"${CAST_PATH}" call ${address} "${sig}" --rpc-url ${rpc || 'http://127.0.0.1:' + anvilPort}`, {
      timeout: 10000, encoding: 'utf-8'
    }).trim();
  } catch(e) { return null; }
}

async function gatherOnChainContext(address) {
  const rpc = `http://127.0.0.1:${anvilPort}`;
  const info = { owner: null, balances: {}, functions: [], state: {} };
  const STABLES = {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
  };

  // Owner (diverse varianten)
  for (const sig of ['owner()(address)', '_owner()(address)', 'admin()(address)', 'governance()(address)']) {
    const r = castCall(address, sig, rpc);
    if (r && r !== '0x0000000000000000000000000000000000000000') { info.owner = r; break; }
  }

  // Token balansen
  for (const [name, tokenAddr] of Object.entries(STABLES)) {
    const r = castCall(tokenAddr, `balanceOf(address)(uint256) ${address}`, rpc);
    if (r && r !== '0') {
      try { info.balances[name] = parseFloat(r) / 1e18; } catch(e) {}
    }
  }

  // BNB balance
  try {
    const bnb = execSync(`"${CAST_PATH}" balance ${address} --rpc-url ${rpc}`, { timeout: 10000, encoding: 'utf-8' }).trim();
    if (bnb && bnb !== '0') info.balances['BNB'] = parseFloat(bnb) / 1e18;
  } catch(e) {}

  // Contract state checks
  for (const [label, sig] of [['paused', 'paused()(bool)'], ['totalSupply', 'totalSupply()(uint256)'], ['decimals', 'decimals()(uint8)']]) {
    const r = castCall(address, sig, rpc);
    if (r !== null) info.state[label] = r;
  }

  // Proxy implementation
  try {
    const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
    const impl = execSync(`"${CAST_PATH}" storage ${address} ${implSlot} --rpc-url ${rpc}`, { timeout: 10000, encoding: 'utf-8' }).trim();
    if (impl && impl !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      info.state.proxyImpl = '0x' + impl.slice(26);
    }
  } catch(e) {}

  return info;
}

// AI exploit generatie
app.post('/api/foundry/ai-exploit', async (req, res) => {
  if (!authDash(req, res)) return;
  if (!CLAUDE_API_KEY) return res.status(400).json({ error: 'Geen Claude API key geconfigureerd' });

  const { address, source, abi } = req.body;
  console.log('[AI] Request ontvangen:', address, '| source:', (source||'').length, 'chars | abi:', Array.isArray(abi) ? abi.length + ' items' : typeof abi);
  if (!source) return res.status(400).json({ error: 'Contract source vereist' });

  try {
    const axios = require('axios');

    // Stap 1: Haal on-chain context op
    let onChainInfo = { owner: null, balances: {}, functions: [], state: {} };
    try {
      onChainInfo = await gatherOnChainContext(address);
    } catch(e) { console.error('[AI] On-chain context fout:', e.message); }

    // Stap 2: Bouw ABI samenvatting
    let abiSummary = 'Geen ABI beschikbaar';
    try {
      const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : (abi || []);
      if (parsedAbi.length > 0) {
        const fns = parsedAbi.filter(a => a.type === 'function').map(f => {
          const inputs = (f.inputs || []).map(i => i.type + ' ' + i.name).join(', ');
          const outputs = (f.outputs || []).map(o => o.type).join(', ');
          const mut = f.stateMutability || '';
          return f.name + '(' + inputs + ') ' + mut + (outputs ? ' → ' + outputs : '');
        });
        abiSummary = fns.join('\n');
      }
    } catch(e) {}

    // Stap 3: Bouw context string
    const balanceStr = Object.entries(onChainInfo.balances).map(function([k,v]) { return k + ': ' + v.toFixed(4); }).join(', ') || 'geen tokens gevonden';
    const stateStr = Object.entries(onChainInfo.state).map(function([k,v]) { return k + ': ' + v; }).join(', ') || 'geen state opgehaald';

    const trimmedSource = source.length > 30000 ? source.substring(0, 30000) + '\n// ... [TRUNCATED]' : source;

    const prompt = 'Je bent een hacker die probeert geld te stelen uit een smart contract. Je bent GEEN eigenaar/owner/admin. Je bent een willekeurige gebruiker met alleen een wallet en onbeperkt startkapitaal (flash loans). Antwoord in het Nederlands.\n\n' +
      'DOEL: Kun jij als NIET-eigenaar tokens of BNB uit dit contract halen? Zo ja, schrijf een werkend exploit script.\n\n' +
      'CONTRACT INFO:\n' +
      '- Adres: ' + address + '\n' +
      '- Chain: BSC (chainId 56)\n' +
      '- Owner/Admin: ' + (onChainInfo.owner || 'ONBEKEND') + ' (jij bent dit NIET, je mag NIET als owner impersonaten)\n' +
      '- Token balansen in contract: ' + balanceStr + '\n' +
      '- Contract state: ' + stateStr + '\n' +
      (onChainInfo.state.proxyImpl ? '- PROXY contract → implementatie: ' + onChainInfo.state.proxyImpl + '\n' : '') +
      '\nABI (functies die je kunt aanroepen):\n' + abiSummary + '\n\n' +
      'SOURCE CODE:\n```solidity\n' + trimmedSource + '\n```\n\n' +
      'AANVAL PLAN:\n' +
      '1. Zoek functies die IEDEREEN kan aanroepen (geen onlyOwner/onlyAdmin modifier)\n' +
      '2. Kan je via die functies tokens uit het contract halen?\n' +
      '3. Kun je via flash loans prijzen manipuleren en zo winst maken?\n' +
      '4. Zijn er rekenfouten waardoor je meer terugkrijgt dan je stort?\n' +
      '5. Kun je dubbel claimen, of state manipuleren zodat je geld vrijspeelt?\n' +
      '6. Is er reentrancy mogelijk zonder guard?\n\n' +
      'REGELS:\n' +
      '- Je mag NIET impersonaten als owner/admin — je bent een random adres\n' +
      '- Je MAG wel flash loans gebruiken (onbeperkt kapitaal)\n' +
      '- Roep ALLEEN functies aan die in de ABI staan\n' +
      '- Als een token balance 0 is, probeer die niet te draineren\n' +
      '- De exploit draait op een Anvil BSC fork\n\n' +
      'EXPLOIT SCRIPT HELPERS (automatisch beschikbaar):\n' +
      '- `provider` — ethers.js v6 JsonRpcProvider\n' +
      '- `TARGET` — contract adres\n' +
      '- `ethers` — ethers.js v6\n' +
      '- `setBalance(addr, ethAmount)` — geef jezelf BNB\n' +
      '- `fund(addr)` — geef 1000 BNB\n' +
      '- NIET impersonate(owner) gebruiken! Maak een random wallet: `const attacker = ethers.Wallet.createRandom().connect(provider);`\n\n' +
      'EXPLOIT SCRIPT STRUCTUUR:\n' +
      '1. const attacker = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);\n' +
      '2. await fund(attacker.address);  // geef attacker BNB voor gas\n' +
      '3. Log balansen VOOR de aanval\n' +
      '4. Voer de aanval uit als attacker (NIET als owner)\n' +
      '5. Log balansen NA de aanval\n' +
      '6. console.log("WINST: $" + winst) of console.log("GEEN EXPLOIT MOGELIJK")\n\n' +
      'Antwoord DIRECT met JSON (geen tekst ervoor, geen markdown):\n' +
      '{"analysis": "wat je gevonden hebt (Nederlands)", "exploitable": true/false, "confidence": "HIGH/MEDIUM/LOW", "exploit_code": "werkend script of null"}\n\n' +
      'Als je GEEN manier vindt om als niet-eigenaar geld eruit te halen: {"analysis":"Geen exploit mogelijk als niet-eigenaar","exploitable":false,"confidence":"HIGH","exploit_code":null}';

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      timeout: 60000
    });

    const aiText = response.data.content[0].text;
    console.log('[AI] Claude response (eerste 300 chars):', aiText.substring(0, 300));

    // Robuuste JSON extractie
    let result = null;
    const codeBlock = aiText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlock) { try { result = JSON.parse(codeBlock[1]); } catch(e) {} }
    if (!result) {
      const start = aiText.indexOf('"analysis"');
      if (start > 0) {
        const bracePos = aiText.lastIndexOf('{', start);
        if (bracePos >= 0) {
          let depth = 0;
          for (let i = bracePos; i < aiText.length; i++) {
            if (aiText[i] === '{') depth++;
            if (aiText[i] === '}') depth--;
            if (depth === 0) { try { result = JSON.parse(aiText.substring(bracePos, i + 1)); } catch(e) {} break; }
          }
        }
      }
    }
    if (!result) {
      console.log('[AI] Geen JSON gevonden in response');
      return res.json({ ok: false, error: 'Geen JSON in AI response', raw: aiText.substring(0, 500) });
    }
    console.log('[AI] Resultaat:', result.exploitable, '| confidence:', result.confidence, '| findings:', (result.findings||[]).length);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[AI] FOUT:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// === PASHOV AUDIT ===
app.post('/api/foundry/pashov-audit', async (req, res) => {
  if (!authDash(req, res)) return;
  if (!CLAUDE_API_KEY) return res.status(400).json({ error: 'Geen Claude API key' });

  const { address, source } = req.body;
  if (!source) return res.status(400).json({ error: 'Contract source vereist' });

  try {
    const axios = require('axios');
    const trimmedSource = source.length > 40000 ? source.substring(0, 40000) + '\n// ... [TRUNCATED]' : source;

    // Lees attack vectors
    let attackVectors = '';
    try { attackVectors = fs.readFileSync('C:/pashov-skills/solidity-auditor/references/attack-vectors/attack-vectors.md', 'utf8').substring(0, 8000); } catch(e) {}

    const prompt = 'Je voert een professionele security audit uit op een BSC smart contract met 8 gespecialiseerde agents. Antwoord VOLLEDIG in het Nederlands.\n\n' +
      'Contract: ' + address + '\n\n```solidity\n' + trimmedSource + '\n```\n\n' +
      '## DE 8 AGENTS — voer ze ALLEMAAL uit:\n\n' +
      '**1. VECTOR SCAN** — Exploit bekende attack vectors op dit contract:\n' + attackVectors.substring(0, 3000) + '\n\n' +
      '**2. MATH PRECISION** — Exploit rekenkunde: afrondingsfouten, precisieverlies, decimal mismatches, overflow. Stortingen afronden OMLAAG, opnames OMLAAG, schuld OMHOOG, fees OMHOOG. Vind deling-voor-vermenigvuldiging, zero-round-to-steal, first-depositor aanvallen. Concrete getallen verplicht.\n\n' +
      '**3. ACCESS CONTROL** — Breng permissiemodel in kaart (rollen, modifiers, guards). Vind inconsistente guards (functie A = onlyOwner, functie B schrijft zelfde variabele onbeschermd). Hijack initialize(). Escaleer privileges. Vind unprotected state changes.\n\n' +
      '**4. ECONOMIC SECURITY** — Onbeperkt kapitaal + flash loans. Breek externe afhankelijkheden, exploit token misbehavior (fee-on-transfer, rebasing, void-return). Bouw deposit→manipuleer→withdraw in 1 tx. Duw fees naar 0 of max.\n\n' +
      '**5. EXECUTION TRACE** — Volg uitvoeringsflow van entry tot state change. Vind parameter divergentie, value leaks (fee afgetrokken maar origineel bedrag doorgestuurd), encoding mismatches, stale reads, partial state updates.\n\n' +
      '**6. INVARIANT** — Vind gebroken invarianten: conservation laws (sum balances = totalSupply), state couplings (X verandert maar Y niet), capacity constraints die omzeild worden.\n\n' +
      '**7. PERIPHERY** — Audit libraries, helpers, utilities, base contracts. Vind ongevalideerde inputs, corrupte return values, verborgen state side effects die callers niet verwachten.\n\n' +
      '**8. FIRST PRINCIPLES** — Vergeet bekende patronen. Lees de logica, identificeer ELKE impliciete aanname, en breek ze systematisch. Geen pattern matching — puur logisch redeneren.\n\n' +
      '## OUTPUT — Begin DIRECT met { (geen tekst, geen markdown)\n' +
      '{"findings": [{"agent": "vector-scan|math|access-control|economic|execution-trace|invariant|periphery|first-principles", "type": "FINDING|LEAD", "severity": "HIGH|MEDIUM|LOW", "contract": "Naam", "function": "functie", "bug_class": "tag", "description": "Nederlands", "proof": "concrete waarden", "fix": "suggestie"}], "summary": "samenvatting in Nederlands", "risk_level": "CRITICAL|HIGH|MEDIUM|LOW|SAFE"}\n\n' +
      'REGELS: FINDINGs = concrete exploiteerbare paden met bewijs. LEADs = code smells met gedeeltelijke paden. NIET rapporteren: admin-only functies, standaard DeFi tradeoffs, self-harm bugs. Begin DIRECT met {';

    console.log('[PASHOV] Audit gestart voor', address, '| source:', trimmedSource.length, 'chars');

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-opus-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      timeout: 180000
    });

    const aiText = response.data.content[0].text;
    console.log('[PASHOV] Response (eerste 300):', aiText.substring(0, 300));

    // Robuuste JSON extractie: zoek het object dat "findings" bevat
    let result = null;
    // Probeer eerst: zoek ```json ... ``` block
    const codeBlock = aiText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlock) {
      try { result = JSON.parse(codeBlock[1]); } catch(e) {}
    }
    // Probeer: vind { dat "findings" bevat door balanced braces te tellen
    if (!result) {
      const start = aiText.indexOf('{"findings"');
      if (start === -1) {
        // Probeer ook met newline
        const start2 = aiText.indexOf('"findings"');
        if (start2 > 0) {
          // Zoek de { ervoor
          const bracePos = aiText.lastIndexOf('{', start2);
          if (bracePos >= 0) {
            let depth = 0;
            for (let i = bracePos; i < aiText.length; i++) {
              if (aiText[i] === '{') depth++;
              if (aiText[i] === '}') depth--;
              if (depth === 0) {
                try { result = JSON.parse(aiText.substring(bracePos, i + 1)); } catch(e) {}
                break;
              }
            }
          }
        }
      } else {
        let depth = 0;
        for (let i = start; i < aiText.length; i++) {
          if (aiText[i] === '{') depth++;
          if (aiText[i] === '}') depth--;
          if (depth === 0) {
            try { result = JSON.parse(aiText.substring(start, i + 1)); } catch(e) {}
            break;
          }
        }
      }
    }

    if (!result) return res.json({ ok: false, error: 'Kon JSON niet parsen', raw: aiText.substring(0, 1500) });

    console.log('[PASHOV] Findings:', (result.findings || []).length, '| Risk:', result.risk_level);
    return res.json({ ok: true, ...result });
  } catch(err) {
    console.error('[PASHOV] Fout:', err.message);
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
    <button onclick="pashovAudit()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#0a0e17;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">Pashov Audit</button>
  </div>

  <div style="padding:0 24px 8px;display:flex;gap:16px">
    <div style="flex:1;min-width:0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <label style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px">Exploit Code (JavaScript / ethers v6)</label>
        <button onclick="runExploit()" style="background:#3fb950;color:#0a0e17;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px">▶ RUN</button>
      </div>
      <textarea id="fl-code" spellcheck="false" style="width:100%;height:400px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:12px;border-radius:8px;font-family:'Courier New',monospace;font-size:13px;line-height:1.5;resize:vertical;tab-size:2">// Klik "AI Exploit" om automatisch exploit code te genereren
// Of schrijf je eigen code hier. Helpers:
// provider, TARGET, ethers, impersonate(addr), setBalance(addr, eth), fund(addr)</textarea>
    </div>
  </div>

  <div style="padding:0 24px 8px;display:flex;gap:16px">
    <div style="flex:1">
      <label style="font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px">AI Exploit Analyse</label>
      <div id="fl-analysis" style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;font-size:13px;color:#8b949e;min-height:60px;margin-top:4px;white-space:pre-wrap">Nog geen analyse uitgevoerd</div>
    </div>
    <div style="flex:1">
      <label style="font-size:11px;color:#f59e0b;text-transform:uppercase;letter-spacing:1px;font-weight:700">Pashov Audit (8 Agents)</label>
      <div id="fl-pashov" style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;font-size:12px;color:#8b949e;min-height:60px;margin-top:4px;max-height:400px;overflow-y:auto">Klik 'Pashov Audit' om professionele security scan te starten</div>
    </div>
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
      contractAbi = d.abi || null;
      const fnCount = (d.abi || []).filter(a => a.type === 'function').length;
      document.getElementById('fl-source').textContent = '// ' + d.name + ' (Compiler: ' + d.compiler + ')\\n// Verified: ' + d.verified + ' | ABI: ' + fnCount + ' functies\\n\\n' + d.source.substring(0, 50000);
    } else {
      contractAbi = null;
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
    if (d.autoRestarted) {
      document.getElementById('fl-output').style.color = '#f0b429';
      document.getElementById('fl-output').textContent = 'Fork was verouderd — automatisch herstart. Opnieuw uitvoeren...';
      checkAnvilStatus();
      setTimeout(runExploit, 3000);
      return;
    }
    document.getElementById('fl-output').style.color = d.ok ? '#3fb950' : '#f85149';
    document.getElementById('fl-output').textContent = d.output || d.error || 'Geen output';
  } catch(e) {
    document.getElementById('fl-output').style.color = '#f85149';
    document.getElementById('fl-output').textContent = 'FOUT: ' + e.message;
  }
}

let contractAbi = null; // wordt gezet door loadContract

async function aiExploit() {
  const addr = document.getElementById('fl-address').value.trim();
  const source = document.getElementById('fl-source').textContent;
  if (!addr) return alert('Vul een contract adres in');
  if (!source || source.includes('Klik') || source.includes('Laden')) return alert('Laad eerst de contract source');

  document.getElementById('fl-analysis').textContent = 'AI analyseert contract + haalt on-chain data op...\\nDit duurt 15-30 seconden...';
  document.getElementById('fl-analysis').style.color = '#f0b429';
  try {
    const r = await fetch('/api/foundry/ai-exploit?key=' + KEY, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ address: addr, source, abi: contractAbi })
    });
    const d = await r.json();
    if (d.ok !== false) {
      const conf = d.confidence === 'HIGH' ? '\\u{1f534}' : d.confidence === 'MEDIUM' ? '\\u{1f7e1}' : '\\u26aa';
      document.getElementById('fl-analysis').style.color = d.exploitable ? '#f85149' : '#3fb950';
      document.getElementById('fl-analysis').textContent = conf + ' Confidence: ' + (d.confidence || '?') + '\\nExploitable: ' + (d.exploitable ? 'JA' : 'NEE') + '\\n\\n' + (d.analysis || 'Geen findings');
      if (d.exploit_code) {
        document.getElementById('fl-code').value = d.exploit_code;
      } else if (d.exploitable) {
        // AI vond bugs maar genereerde geen code — maak een basis recon
        const addr = document.getElementById('fl-address').value.trim();
        document.getElementById('fl-code').value = '// AI vond bugs maar genereerde geen exploit code.\\n// Hieronder een basis recon script. Pas het aan op basis van de analyse hierboven.\\n\\nconst USDT = "0x55d398326f99059fF775485246999027B3197955";\\nconst USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";\\nconst BUSD = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";\\nconst erc20 = ["function balanceOf(address) view returns (uint256)"];\\n\\nconsole.log("=== CONTRACT RECON ===");\\nconsole.log("Target:", TARGET);\\n\\n// Balansen\\nfor (const [name, addr] of [["USDT", USDT], ["USDC", USDC], ["BUSD", BUSD]]) {\\n  const bal = await new ethers.Contract(addr, erc20, provider).balanceOf(TARGET);\\n  if (bal > 0n) console.log(name + ":", ethers.formatUnits(bal, 18));\\n}\\nconsole.log("BNB:", ethers.formatEther(await provider.getBalance(TARGET)));\\n\\n// TODO: Voeg exploit logica toe op basis van de AI analyse';
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

async function pashovAudit() {
  const addr = document.getElementById('fl-address').value.trim();
  const source = document.getElementById('fl-source').textContent;
  if (!addr) return alert('Vul een contract adres in');
  if (!source || source.includes('Klik') || source.includes('Laden')) return alert('Laad eerst de contract source');

  const panel = document.getElementById('fl-pashov');
  panel.style.color = '#f59e0b';
  panel.innerHTML = '<div style="font-weight:700">Pashov Audit draait...</div><div style="margin-top:8px">Agent 1: Vector Scan...<br>Agent 2: Math Precision...<br>Agent 3: Economic Security...<br><br>Dit duurt 30-60 seconden</div>';

  try {
    const r = await fetch('/api/foundry/pashov-audit?key=' + KEY, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ address: addr, source })
    });
    const d = await r.json();

    if (d.ok !== false && d.findings) {
      const riskColors = { CRITICAL: '#f85149', HIGH: '#f85149', MEDIUM: '#f0b429', LOW: '#8b949e', SAFE: '#3fb950' };
      const riskColor = riskColors[d.risk_level] || '#8b949e';

      let html = '<div style="font-weight:700;font-size:14px;color:' + riskColor + ';margin-bottom:8px">RISK: ' + (d.risk_level || '?') + '</div>';
      html += '<div style="color:#c9d1d9;margin-bottom:12px;font-size:12px">' + (d.summary || '') + '</div>';

      if (d.findings.length === 0) {
        html += '<div style="color:#3fb950">Geen findings - contract lijkt veilig</div>';
      } else {
        const findings = d.findings.filter(f => f.type === 'FINDING');
        const leads = d.findings.filter(f => f.type === 'LEAD');

        if (findings.length > 0) {
          html += '<div style="font-weight:700;color:#f85149;margin-bottom:6px">FINDINGS (' + findings.length + ')</div>';
          findings.forEach((f, i) => {
            const sevColor = f.severity === 'HIGH' ? '#f85149' : f.severity === 'MEDIUM' ? '#f0b429' : '#8b949e';
            html += '<div style="background:#161b22;border:1px solid #21262d;border-radius:6px;padding:10px;margin-bottom:8px">';
            html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:4px"><span style="background:' + sevColor + '22;color:' + sevColor + ';padding:2px 6px;border-radius:3px;font-size:10px;font-weight:700">' + f.severity + '</span>';
            html += '<span style="font-size:10px;color:#8b949e">' + (f.agent || '') + '</span></div>';
            html += '<div style="color:#c9d1d9;font-weight:600;font-size:12px">' + (f.bug_class || '') + ' in ' + (f.function || '?') + '</div>';
            html += '<div style="color:#8b949e;font-size:11px;margin-top:4px">' + (f.description || '') + '</div>';
            if (f.proof) html += '<div style="color:#58a6ff;font-size:11px;margin-top:4px;font-family:monospace">Proof: ' + f.proof.substring(0, 200) + '</div>';
            if (f.fix) html += '<div style="color:#3fb950;font-size:11px;margin-top:4px">Fix: ' + f.fix + '</div>';
            html += '</div>';
          });
        }

        if (leads.length > 0) {
          html += '<div style="font-weight:700;color:#f0b429;margin:12px 0 6px">LEADS (' + leads.length + ')</div>';
          leads.forEach(f => {
            html += '<div style="padding:6px 0;border-bottom:1px solid #21262d;font-size:11px">';
            html += '<span style="color:#f0b429;font-weight:600">[' + (f.agent || '') + ']</span> ';
            html += '<span style="color:#c9d1d9">' + (f.bug_class || '') + '</span> — ';
            html += '<span style="color:#8b949e">' + (f.description || '') + '</span></div>';
          });
        }
      }
      panel.innerHTML = html;
    } else {
      panel.style.color = '#f85149';
      panel.textContent = 'FOUT: ' + (d.error || d.raw || 'Onbekend');
    }
  } catch(e) {
    panel.style.color = '#f85149';
    panel.textContent = 'FOUT: ' + e.message;
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
