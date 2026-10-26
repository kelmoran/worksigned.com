#!/usr/bin/env python3
"""Equalize the visible size of the 4 brand marks so they carry the same
visual weight in the showpiece grid. Each mark is re-placed on a 128px canvas
scaled so its opaque bbox fills the same fraction of the canvas. This makes
the Azure / S3 / GCS / DSpace tiles read at one consistent size and keeps
every mark centered.
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SVG = os.path.join(HERE, "svg")
CANVAS = 128
TARGET = 0.88  # bbox longest side as a fraction of the canvas (uniform)


def recenter(name):
    im = Image.open(os.path.join(SVG, name + ".png")).convert("RGBA")
    bbox = im.getbbox()
    l, t, r, b = bbox
    im = im.crop(bbox)
    tw, th = im.size
    longest = max(tw, th)
    scale = (CANVAS * TARGET) / longest
    nw = max(1, int(round(tw * scale)))
    nh = max(1, int(round(th * scale)))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    ox = (CANVAS - nw) // 2
    oy = (CANVAS - nh) // 2
    canvas.paste(im, (ox, oy), im)
    canvas.save(os.path.join(SVG, name + ".png"))
    print(f"{name:7} content {tw}x{th} -> {nw}x{nh}  centered @ ({ox},{oy})")


for n in ["blob", "gcs", "dspace", "s3", "ssh", "sftp"]:
    recenter(n)
print("done")
