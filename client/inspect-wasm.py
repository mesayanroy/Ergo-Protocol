import os

path = '../target/wasm32-unknown-unknown/release/oracle_aggregator.wasm'
if not os.path.exists(path):
    print("WASM file not found")
    exit(1)

with open(path, 'rb') as f:
    data = f.read()

offset = 11599
print(f"File size: {len(data)} bytes")
print(f"Bytes around offset {offset}:")
start = max(0, offset - 30)
end = min(len(data), offset + 30)

for i in range(start, end):
    prefix = "-> " if i == offset else "   "
    print(f"{prefix}{i}: 0x{data[i]:02x} ({chr(data[i]) if 32 <= data[i] < 127 else '.'})")
