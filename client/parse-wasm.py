import os

def parse_wasm(path):
    print(f"\nParsing {os.path.basename(path)}:")
    with open(path, 'rb') as f:
        data = f.read()
    
    # Verify magic number and version
    if data[:4] != b'\x00\x61\x73\x6d':
        print("Invalid WASM magic number")
        return
    
    offset = 8
    while offset < len(data):
        section_id = data[offset]
        offset += 1
        
        # Read section size (varuint32)
        size = 0
        shift = 0
        while True:
            byte = data[offset]
            offset += 1
            size |= (byte & 0x7f) << shift
            if not (byte & 0x80):
                break
            shift += 7
            
        print(f"Section ID: {section_id}, Size: {size}")
        
        if section_id == 0:
            # Custom section
            custom_offset = offset
            name_len = 0
            shift = 0
            while True:
                byte = data[custom_offset]
                custom_offset += 1
                name_len |= (byte & 0x7f) << shift
                if not (byte & 0x80):
                    break
                shift += 7
            
            name = data[custom_offset : custom_offset + name_len]
            print(f"  Custom Section Name: {name.decode('utf-8', errors='ignore')}")
            
        offset += size

parse_wasm('../target/wasm32-unknown-unknown/release/oracle_aggregator.wasm')
