import urllib.request
import json
import csv
import os
import shutil
from stellar_sdk import StrKey, xdr as stellar_xdr

contracts_mainnet = {
    'CCGIBZCTJQV5ENURT6YKGZ34VVGELBR2O2NUCZED2DDMV4T7FWMJMFKK': 'Core Pool',
    'CBHFJXAP7EZUGCK4NNVT57JMW3KHBHXYFEAPCIT7UBHIAZJ2S5O24LEY': 'Backstop Pool',
    'CBGWB7FCL5OMOUKSCXBZQ5FVFSHX3RDVD53QHZ6JRYRXQVHSLGIAPVHJ': 'Liquidation Engine',
    'CCZIMNOOYPBJBVAXOOIPSI2SJNR6R3LBEEZNDIEI2H2YVTYASAVI772H': 'Oracle Aggregator',
    'CBL5WKK2WQ4XGGN25DW3OP2LIGI5GUDLBXNQ76ZLFQLU3RRBBAPGQTLU': 'Governance & Compliance',
    'CDILV5HTHZGWQYRL6TJP3MUTSCRXXQSAUHBMASXPZVC2BS4I3QUE5IDQ': 'ERGO Protocol Token',
    'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA': 'Stellar Asset Contract (XLM)',
    'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75': 'Stellar Asset Contract (USDC)',
    'CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV': 'Stellar Asset Contract (EURC)'
}

contracts_testnet = {
    'CBHSTINK374ABHBJ7MK347ICJ6JKVSTD72Y5BGZN5V6BJGLNKYYFEI3O': 'Core Pool',
    'CC7Z66HSB2TYHRZF66HIAZ3CWYZTJ43SVPBORKMCBND7XXD4M2N4F6BF': 'Backstop Pool',
    'CBEQWOF57VRRY6UCYZ4TIBUZVC6Q3KPAUR452N2SKA2W6AT5WNPDVAEB': 'Liquidation Engine',
    'CABJ7EVKBTHFYKIC2CK362SVZJRMU7HSUGIBPFMBNUDMBBOGUEBZ3ABK': 'Oracle Aggregator',
    'CC6B6DORNT7KKJXE7KXBBH5YEQQV2EAYGJX2CVJMQGXNRUDAPGVEKEJ5': 'Governance',
    'CAFU624RJD3QLLGL4J7TX5C43JBGLHTPRWB5VLWU3ED4DHIR6PC6R5US': 'Compliance',
    'CDYJFYG7X4DPMAOQUUTYEK5KAOSTI7LEG4VDVSZ6KZQFM66LFHSLVBLZ': 'ERGO Protocol Token',
    'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC': 'Stellar Asset Contract (XLM)',
    'CB36S4EBJD34LVRY6KQHWTZPFN7HVURVTYOVTYIS2UZKSBPTCDMGYVSB': 'Stellar Asset Contract (USDC)',
    'CCSHAPUB4KRRDGA3PWUWO6WKULCLNXW7N5JYVFVVQWNSQUPR6E4PVLUW': 'Stellar Asset Contract (EURC)',
    'CDPU6K2FLBNLO4RIGQSRENFUEOLXHWXPY243WZBNOBUK5QEFBNXHSNSE': 'Stellar Asset Contract (WBTC)',
    'CC2DS3NYQJ5XSLWQWREIHJVIGW6KCVOB2E4IIKQ3KNXN647GLMJKDMJ5': 'Stellar Asset Contract (WETH)'
}

def decode_scval(scval_xdr_b64):
    try:
        scval = stellar_xdr.SCVal.from_xdr(scval_xdr_b64)
        if scval.type == stellar_xdr.SCValType.SCV_ADDRESS:
            addr = scval.address
            if addr.type == stellar_xdr.SCAddressType.SC_ADDRESS_TYPE_CONTRACT:
                return ('contract', StrKey.encode_contract(addr.contract_id.contract_id.hash))
            elif addr.type == stellar_xdr.SCAddressType.SC_ADDRESS_TYPE_ACCOUNT:
                return ('account', StrKey.encode_ed25519_public_key(addr.account_id.account_id.ed25519.uint256))
        elif scval.type == stellar_xdr.SCValType.SCV_SYMBOL:
            return ('symbol', scval.sym.sc_symbol.decode('utf-8'))
    except Exception as e:
        pass
    return None

def fetch_all_operations(base_url, account_ids):
    all_ops = []
    seen_ops = set()
    for acc in account_ids:
        url = f'{base_url}/accounts/{acc}/operations?limit=200&order=desc'
        while url:
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    recs = data['_embedded']['records']
                    if not recs:
                        break
                    for op in recs:
                        if op['id'] not in seen_ops:
                            seen_ops.add(op['id'])
                            all_ops.append(op)
                    url = data['_links']['next']['href']
                    if len(recs) < 200:
                        break
            except Exception as e:
                print(f'Error fetching for {acc}:', e)
                break
    return all_ops

mainnet_creators = ['GCK5L4DAV67YSSYKFWRCELY2BDODO5UURWD42QM7HR4ORQWSORMS3JHE', 'GARN7A6OJKPR3HAPVIKM6GRUD7KMEHYQ76VJJCO4AAKQ6ETEKFQPQ24T']
testnet_creators = ['GCLYB6KF54YF6J5QVBJXW3TBU634GZ5X45CWHKGL5Y42VSXD2OBOIWBL', 'GB7NRH4HKV3WAVUM7ZYNMP7BSWHYIOI4KQTCZKFB6CJWK7WXL7GHNQLB']

print('Fetching mainnet operations...')
main_ops = fetch_all_operations('https://horizon.stellar.org', mainnet_creators)

print('Fetching testnet operations...')
test_ops = fetch_all_operations('https://horizon-testnet.stellar.org', testnet_creators)

def parse_operations(ops, contract_map, network_name):
    rows = []
    for op in ops:
        tx_hash = op.get('transaction_hash')
        created_at = op.get('created_at')
        source_account = op.get('source_account')
        op_type = op.get('type')
        successful = op.get('transaction_successful', True)
        
        contract_id = 'N/A'
        contract_name = 'Protocol Deployment & Infrastructure'
        function_name = op_type
        
        params = op.get('parameters')
        if params:
            for p in params:
                val = p.get('value')
                if val:
                    res = decode_scval(val)
                    if res:
                        kind, decoded = res
                        if kind == 'contract' and contract_id == 'N/A':
                            contract_id = decoded
                            contract_name = contract_map.get(decoded, f'Soroban Contract ({decoded[:8]}...)')
                        elif kind == 'symbol' and function_name == op_type:
                            function_name = decoded

        rows.append({
            'network': network_name,
            'tx_hash': tx_hash,
            'timestamp': created_at,
            'source_account': source_account,
            'contract_name': contract_name,
            'contract_id': contract_id,
            'function_name': function_name,
            'op_type': op_type,
            'status': 'SUCCESS' if successful else 'FAILED'
        })
    return rows

main_rows = parse_operations(main_ops, contracts_mainnet, 'Mainnet')
test_rows = parse_operations(test_ops, contracts_testnet, 'Testnet')

def save_csv(filename, rows):
    fieldnames = ['network', 'tx_hash', 'timestamp', 'source_account', 'contract_name', 'contract_id', 'function_name', 'op_type', 'status']
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

# Save to project root
save_csv('mainnet_transactions.csv', main_rows)
save_csv('testnet_transactions.csv', test_rows)

# Also copy to artifacts directory
artifact_dir = r'C:\Users\SAYAN\.gemini\antigravity-ide\brain\ab3fc032-a56e-4af1-8f5e-0fbcbabc7eb9'
if os.path.exists(artifact_dir):
    shutil.copy('mainnet_transactions.csv', os.path.join(artifact_dir, 'mainnet_transactions.csv'))
    shutil.copy('testnet_transactions.csv', os.path.join(artifact_dir, 'testnet_transactions.csv'))

print('=== SUMMARY METRICS ===')
print(f'MAINNET: Total Operations/Transactions = {len(main_rows)}')
main_users = set(r["source_account"] for r in main_rows)
print(f'MAINNET: Unique Active Users/Wallets = {len(main_users)}')
print('MAINNET Division Breakdown:')
main_counts = {}
for r in main_rows:
    c = r['contract_name']
    main_counts[c] = main_counts.get(c, 0) + 1
for c, cnt in sorted(main_counts.items(), key=lambda x: x[1], reverse=True):
    print(f'  - {c}: {cnt} transactions')

print(f'\nTESTNET: Total Operations/Transactions = {len(test_rows)}')
test_users = set(r["source_account"] for r in test_rows)
print(f'TESTNET: Unique Active Users/Wallets = {len(test_users)}')
print('TESTNET Division Breakdown:')
test_counts = {}
for r in test_rows:
    c = r['contract_name']
    test_counts[c] = test_counts.get(c, 0) + 1
for c, cnt in sorted(test_counts.items(), key=lambda x: x[1], reverse=True):
    print(f'  - {c}: {cnt} transactions')
