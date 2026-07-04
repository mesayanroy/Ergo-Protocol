from PIL import Image
import os

folder = "C:/Users/SAYAN/.gemini/antigravity-ide/brain/bb1b6f3d-0ce3-4aa6-8aa6-ae19d31f9d14/.tempmediaStorage/"
files = [
    "media_bb1b6f3d-0ce3-4aa6-8aa6-ae19d31f9d14_1783083236735.png",
    "media_bb1b6f3d-0ce3-4aa6-8aa6-ae19d31f9d14_1783083310473.png"
]

for f in files:
    path = os.path.join(folder, f)
    if os.path.exists(path):
        img = Image.open(path)
        print(f"{f}: size={img.size}, format={img.format}")
