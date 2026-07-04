import os
import sys
import subprocess

try:
    from PIL import Image, ImageDraw, ImageOps
except ImportError:
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageOps

source_dir = r"C:\Users\SAYAN\.gemini\antigravity-ide\brain\bb1b6f3d-0ce3-4aa6-8aa6-ae19d31f9d14"
dest_dir = r"C:\Users\SAYAN\Ergo-Protocol-1\client\public"

mapping = [
    ("media__1783109275562.png", "logo_usdc.png"),
    ("media__1783109362626.png", "logo_wbtc.png"),
    ("media__1783109412712.png", "logo_xlm.png"),
    ("media__1783109575073.png", "logo_ergo.png"),
    ("media__1783110958708.png", "logo_weth.png")
]

def make_circular(img_path, dest_path):
    img = Image.open(img_path).convert("RGBA")
    
    # Crop to square (centered)
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim
    
    img = img.crop((left, top, right, bottom))
    size = (min_dim, min_dim)
    
    # Create mask for circular shape
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0) + size, fill=255)
    
    # Apply mask as alpha layer
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.paste(img, (0, 0), mask=mask)
    
    # Resize to standard logo size (128x128)
    output = output.resize((128, 128), Image.Resampling.LANCZOS)
    output.save(dest_path, "PNG")
    print(f"Created circular logo: {dest_path}")

def main():
    os.makedirs(dest_dir, exist_ok=True)
    for src_name, dest_name in mapping:
        src_path = os.path.join(source_dir, src_name)
        dest_path = os.path.join(dest_dir, dest_name)
        if os.path.exists(src_path):
            make_circular(src_path, dest_path)
        else:
            print(f"Source file not found: {src_path}")

if __name__ == "__main__":
    main()
