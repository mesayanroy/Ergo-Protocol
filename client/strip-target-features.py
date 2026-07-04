import os
import glob

def strip_target_features(path):
    print(f"Stripping target_features from {os.path.basename(path)}...")
    with open(path, 'rb') as f:
        data = f.read()
    
    if data[:4] != b'\x00\x61\x73\x6d':
        print("  Invalid WASM magic number")
        return
        
    out = bytearray(data[:8])
    offset = 8
    stripped_any = False
    
    while offset < len(data):
        start_offset = offset
        section_id = data[offset]
        offset += 1
        
        # Read section size (varuint32)
        size = 0
        shift = 0
        size_bytes = []
        while True:
            byte = data[offset]
            offset += 1
            size_bytes.append(byte)
            size |= (byte & 0x7f) << shift
            if not (byte & 0x80):
                break
            shift += 7
            
        section_data = data[offset : offset + size]
        offset += size
        
        # Check if it's the target_features custom section
        is_target_features = False
        if section_id == 0:
            custom_offset = 0
            name_len = 0
            shift = 0
            while True:
                byte = section_data[custom_offset]
                custom_offset += 1
                name_len |= (byte & 0x7f) << shift
                if not (byte & 0x80):
                    break
                shift += 7
            
            name = section_data[custom_offset : custom_offset + name_len].decode('utf-8', errors='ignore')
            if name == 'target_features':
                is_target_features = True
                
        if is_target_features:
            print(f"  Found and stripped target_features custom section (Size: {size})")
            stripped_any = True
        else:
            # Keep the section
            out.append(section_id)
            # Write size as varuint32
            out.extend(size_bytes)
            out.extend(section_data)
            
    if stripped_any:
        with open(path, 'wb') as f:
            f.write(out)
        print("  [OK] Stripped and saved.")
    else:
        print("  No target_features section found.")

# Strip target_features from all wasm files
release_dir = '../target/wasm32-unknown-unknown/release'
for wasm_path in glob.glob(os.path.join(release_dir, '*.wasm')):
    strip_target_features(wasm_path)
