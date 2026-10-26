#!/usr/bin/env python3
"""Turn the user's source brand marks (svg/*_src.*) into clean, transparent,
square-cropped PNG assets:
  - website marks (svg/<name>.png, 128px, for the showpiece grid)
  - app marks     (svg/<name>_app.png, 32px, for the Electron mount picker)

Each source sits on a solid white (or iRODS teal) background. We key the
background out to transparent, trim to the mark's tight bbox, then place the
result centered in a square with even padding.
"""
import base64
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SVG = os.path.join(HERE, "svg")

# (src, out_base, bg, max_frac)  bg = the background to key out; max_frac =
# largest side the trimmed mark may occupy relative to the final square.
JOBS = [
    ("blob_src.png",   "blob",   "white", 0.90),
    ("gcs_src.jpg",    "gcs",    "white", 0.86),
    ("dspace_src.png", "dspace", "white", 0.78),
    ("s3_src.png",     "s3",     "white", 0.80),
]


def is_bg(p, bg):
    r, g, b, a = p
    if bg == "white":
        return r > 245 and g > 245 and b > 245
    return False


def prep(src, out_base, bg, max_frac):
    im = Image.open(os.path.join(SVG, src)).convert("RGBA")
    W, H = im.size
    px = im.load()
    # key the background out (alpha 0). The marks are solid with flat edges on
    # a clean white field, so a hard key is clean; feather 1px to kill fringes.
    for y in range(H):
        for x in range(W):
            if is_bg(px[x, y], bg):
                px[x, y] = (255, 255, 255, 0)
    # 1px feather: any pixel adjacent to a transparent one drops its alpha a bit
    mask = Image.new("L", (W, H))
    mp = mask.load()
    for y in range(H):
        for x in range(W):
            a = px[x, y][3]
            mp[x, y] = 255 if a > 0 else 0
    mask = mask.filter(ImageFilter_Blur1())
    # re-apply: keep alpha where mask high
    for y in range(H):
        for x in range(W):
            if px[x, y][3] > 0 and mp[x, y] < 255:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, mp[x, y])
    im.putalpha(mask)
    # trim to the opaque bbox
    bbox = im.getbbox()
    if not bbox:
        raise SystemExit("nothing left after keying: " + src)
    im = im.crop(bbox)
    tw, th = im.size
    # pad to a square with the trimmed mark centered at max_frac
    side = int(round(max(tw, th) / max_frac))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - tw) // 2
    oy = (side - th) // 2
    canvas.paste(im, (ox, oy), im)
    return canvas


def ImageFilter_Blur1():
    from PIL import ImageFilter
    return ImageFilter.GaussianBlur(radius=1)


def emit_web(canvas, out_base):
    web = canvas.resize((128, 128), Image.LANCZOS)
    web.save(os.path.join(SVG, out_base + ".png"))


def emit_app(canvas, out_base):
    app = canvas.resize((32, 32), Image.LANCZOS)
    app.save(os.path.join(SVG, out_base + "_app.png"))
    b = open(os.path.join(SVG, out_base + "_app.png"), "rb").read()
    return "data:image/png;base64," + base64.b64encode(b).decode()


def main():
    data_uris = {}
    for src, out_base, bg, frac in JOBS:
        canvas = prep(src, out_base, bg, frac)
        emit_web(canvas, out_base)
        data_uris[out_base] = emit_app(canvas, out_base)
        print(f"{out_base:8} web 128  app 32  (uri {len(data_uris[out_base])} chars)")
    # write the 4 app data-URIs to a file for the icons.js patch
    import json
    out = os.path.join(HERE, "app_icons.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data_uris, f)
    print("wrote", out)


if __name__ == "__main__":
    main()
