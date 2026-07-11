import os
import subprocess
import glob

wasm_dir = r"c:\Users\SAYAN\Ergo-Protocol-1\target\wasm32-unknown-unknown\release"
client_dir = r"c:\Users\SAYAN\Ergo-Protocol-1\client"

wasm_files = glob.glob(os.path.join(wasm_dir, "*.wasm"))

print("=== OPTIMIZING WASM CONTRACTS WITH WASM-OPT ===")
for wasm_path in wasm_files:
    filename = os.path.basename(wasm_path)
    old_size = os.path.getsize(wasm_path)
    
    print(f"Optimizing {filename} (Original: {old_size / 1024:.2f} KB)...")
    
    cmd = [
        "pnpm", "exec", "wasm-opt",
        "-Oz",
        "--strip-debug",
        "--strip-producers",
        "--converge",
        wasm_path,
        "-o", wasm_path
    ]
    
    try:
        subprocess.run(cmd, cwd=client_dir, check=True, shell=True)
        new_size = os.path.getsize(wasm_path)
        reduction = (old_size - new_size) / old_size * 100
        print(f"  [OK] Optimized {filename}: {new_size / 1024:.2f} KB ({reduction:.1f}% size reduction)")
    except Exception as e:
        print(f"  [ERROR] Failed to optimize {filename}: {e}")

print("\n=== STRIPPING TARGET FEATURES ===")
strip_script = os.path.join(client_dir, "strip-target-features.py")
if os.path.exists(strip_script):
    try:
        subprocess.run(["python", strip_script], check=True)
    except Exception as e:
        print(f"  [ERROR] Failed to run strip-target-features: {e}")
