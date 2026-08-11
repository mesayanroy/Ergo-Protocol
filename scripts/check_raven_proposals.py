import subprocess
import json
import time
import sys

def main():
    cmd = 'npx -y mcp-remote@latest https://raven.stellar.org/mcp --transport http-only'
    proc = subprocess.Popen(cmd, shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    def send_msg(msg):
        raw = json.dumps(msg) + '\n'
        proc.stdin.write(raw)
        proc.stdin.flush()

    init_req = {
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'initialize',
        'params': {
            'protocolVersion': '2024-11-05',
            'capabilities': {},
            'clientInfo': {'name': 'antigravity', 'version': '1.0.0'}
        }
    }

    send_msg(init_req)

    tools = []
    
    start_time = time.time()
    while time.time() - start_time < 15:
        line = proc.stdout.readline()
        if not line:
            break
        try:
            data = json.loads(line)
            if data.get('id') == 1:
                send_msg({'jsonrpc': '2.0', 'method': 'notifications/initialized'})
                send_msg({'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list', 'params': {}})
            elif data.get('id') == 2:
                result = data.get('result', {})
                tools = result.get('tools', [])
                print(f"Connected to Stellar Raven MCP! Found {len(tools)} tools:")
                for t in tools:
                    print(f" - {t.get('name')}: {t.get('description')}")
                break
        except Exception as e:
            pass

    proc.kill()

if __name__ == '__main__':
    main()
