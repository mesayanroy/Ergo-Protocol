const { spawn } = require('child_process');

const proc = spawn('npx', ['-y', 'mcp-remote@latest', 'https://raven.stellar.org/mcp', '--transport', 'http-only'], {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';

proc.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
        if (!line.trim()) continue;
        console.log('RECV:', line);
        try {
            const msg = JSON.parse(line);
            if (msg.id === 1) {
                // Initialized
                proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
                // List tools
                proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n');
            } else if (msg.id === 2) {
                console.log('\n=== RAVEN MCP TOOLS ===');
                console.log(JSON.stringify(msg.result, null, 2));
                process.exit(0);
            }
        } catch (e) {
            console.error('Parse error:', e);
        }
    }
});

proc.stderr.on('data', (data) => {
    console.error('STDERR:', data.toString());
});

// Send init
const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'antigravity', version: '1.0.0' }
    }
};

proc.stdin.write(JSON.stringify(init) + '\n');
