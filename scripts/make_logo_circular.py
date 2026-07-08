import os
import sys
import subprocess

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw

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
    
    # Resize to standard logo size (512x512)
    output = output.resize((512, 512), Image.Resampling.LANCZOS)
    output.save(dest_path, "PNG")
    print(f"Created circular logo: {dest_path}")

if __name__ == "__main__":
    logo_path = r"c:\Users\SAYAN\Ergo-Protocol-1\client\public\logo.png"
    if os.path.exists(logo_path):
        make_circular(logo_path, logo_path)
    else:
        print(f"Error: Logo file not found at {logo_path}")
