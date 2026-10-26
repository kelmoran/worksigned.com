#!/usr/bin/env python3
"""Process the SSH and SFTP source marks (white background) into transparent,
square-cropped PNG assets for the website (128px) and the app (32px).

ssh:  a black rounded-terminal badge with ">_" + "SSH" -> key out white.
sftp: a yellow "SFTP" folder badge on a grey stand with a red dot -> key out
      white (the whole badge+stand assembly).
Both are centered in a square with even padding.
"""
import base64
import os
from PIL import Image
from PIL import ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SVG = os.path.join(HERE, "svg")
IN = "/home/ew3/d/Downloads/incoming"


def key_white(im):
    im = im.convert("RGBA")
    W, H = im.size
    px = im.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if r > 245 and g > 245 and b > 245:
                px[x, y] = (255, 255, 255, 0)
    # feather 1px to kill white fringing on edges
    alpha = Image.new("L", (W, H))
    ap = alpha.load()
    for y in range(H):
        for x in range(W):
            ap[x, y] = 255 if px[x, y][3] > 0 else 0
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=1))
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > 0 and alpha.getpixel((x, y)) < 255:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, alpha.getpixel((x, y)))
    return im


def to_square(im, max_frac):
    bbox = im.getbbox()
    if not bbox:
        raise SystemExit("empty after keying")
    im = im.crop(bbox)
    tw, th = im.size
    side = int(round(max(tw, th) / max_frac))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - tw) // 2
    oy = (side - th) // 2
    canvas.paste(im, (ox, oy), im)
    return canvas


JOBS = [
    ("ssh.png",  "ssh",  0.90),
    ("sftp.png", "sftp", 0.86),
]

data_uris = {}
for src, out_base, frac in JOBS:
    im = key_white(Image.open(os.path.join(IN, src)))
    canvas = to_square(im, frac)
    canvas.resize((128, 128), Image.LANCZOS).save(os.path.join(SVG, out_base + ".png"))
    app = canvas.resize((32, 32), Image.LANCZOS)
    app.save(os.path.join(SVG, out_base + "_app.png"))
    b = open(os.path.join(SVG, out_base + "_app.png"), "rb").read()
    data_uris[out_base] = "data:image/png;base64," + base64.b64encode(b).decode()
    print(f"{out_base:6} web 128  app 32  (uri {len(data_uris[out_base])} chars)")

import json
json.dump(data_uris, open(os.path.join(HERE, "app_icons_ssh_sftp.json"), "w"))
print("wrote app_icons_ssh_sftp.json")
