#!/usr/bin/env python3
"""Build the normalized 24x24 icon set for the website showpiece.

Every entry in icons.json is a string of ONE of:
  - a full 24x24 inline SVG (viewBox "0 0 24 24"), or
  - a data: URI for a PNG asset (the brand-accurate marks that come from
    real logos: Azure Blob, GCS, S3, DSpace, Google Drive, iRODS).

The four "generic" items (local dir, SSH, SFTP) have no single official
brand mark, so they keep the hand-drawn 16x16 marks from the app (icons.js).
The PostgreSQL and MariaDB marks are simple-icons SVGs.

The PNG brand marks are produced by prepare_icons.py (transparent, square).

Run:  python3 build_icons.py   (writes ../icons.json)
"""
import base64
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SVG = os.path.join(HERE, "svg")


def svg_body(path):
    s = open(os.path.join(SVG, path), encoding="utf-8").read()
    m = re.search(r"<svg[\s\S]*?</svg>", s)
    if not m:
        raise SystemExit(f"no <svg> in {path}")
    return m.group(0)


def force_viewbox(svg, vb="0 0 24 24"):
    if re.search(r'viewBox="[^"]+"', svg):
        svg = re.sub(r'viewBox="[^"]+"', f'viewBox="{vb}"', svg, count=1)
    else:
        svg = svg.replace("<svg ", f'<svg viewBox="{vb}" ', 1)
    svg = re.sub(r'\swidth="\d+(?:\.\d+)?px?"', "", svg, count=1)
    svg = re.sub(r'\sheight="\d+(?:\.\d+)?px?"', "", svg, count=1)
    return svg


def png_data(path):
    b = open(os.path.join(SVG, path), "rb").read()
    return "data:image/png;base64," + base64.b64encode(b).decode()


# ---- 24x24 web-sourced brand marks ----
postgres = force_viewbox(svg_body("si_postgresql.svg"))
# Add a light background rect for visibility on dark tiles (insert after <title>)
postgres = postgres.replace(
    '</title>',
    '</title><rect x="1" y="1" width="22" height="22" rx="4" fill="#e8f5e9"/>',
    1
)
mariadb = force_viewbox(svg_body("si_mariadb.svg"))

# iRODS is a horizontal wordmark lockup (547.56 x 114.47, aspect ~4.8:1).
# Use a wider viewBox (24x8) to match the wordmark's aspect ratio so it
# renders at a larger effective size in the square tile.
irods = force_viewbox(svg_body("irods_teal.svg"), "0 0 547.56 114.47")
IW, IH = 547.56, 114.47
VBW, VBH = 24.0, 8.0  # wider viewBox
s = min(VBW / IW, VBH / IH)
tx = (VBW - IW * s) / 2.0
ty = (VBH - IH * s) / 2.0
irods = re.sub(r"<svg([^>]*)>",
               f'<svg viewBox="0 0 {VBW:.0f} {VBH:.0f}" xmlns="http://www.w3.org/2000/svg">'
               f'<g transform="translate({tx:.4f},{ty:.4f}) scale({s:.5f})">',
               irods, count=1)
irods = irods.rstrip()
if irods.endswith("</svg>"):
    irods = irods[: -len("</svg>")] + "</g></svg>"

# ---- brand-accurate PNG marks (real logos, transparent) ----
azure = png_data("blob.png")
gcs = png_data("gcs.png")
s3 = png_data("s3.png")
dspace = png_data("dspace.png")
gdrive = png_data("gdrive.png")
ssh = png_data("ssh_bg.png")
sftp = png_data("sftp.png")

# ---- hand-drawn 16x16 marks (generic, no official brand) from icons.js ----
import subprocess
APP_ICONS = "/home/ew3/agents/papertrail/project/v3/electron/src_web/os/ui/js/icons.js"
_js = """
const fs=require('fs');
global.window={};global.PT={};global.document={createElement:()=>({setAttribute(){},appendChild(){},style:{}})};
const src=fs.readFileSync(process.argv[1],'utf8');eval(src);
const a=PT.Icons.all;
const w=['posix'];
fs.writeFileSync('/tmp/_app_icons.json',JSON.stringify(Object.fromEntries(w.map(k=>[k,a[k]]))));
"""
subprocess.run(["node", "-e", _js, APP_ICONS], check=True)
_app = json.load(open("/tmp/_app_icons.json", encoding="utf-8"))


def app_icon(name, pad=1.5):
    svg = _app[name]
    scale = (24 - 2 * pad) / 16.0
    off = pad
    svg = re.sub(r"<svg([^>]*)>",
                 f'<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
                 f'<g transform="translate({off},{off}) scale({scale})">',
                 svg, count=1)
    svg = svg.rstrip()
    if svg.endswith("</svg>"):
        svg = svg[: -len("</svg>")] + "</g></svg>"
    return svg


def web_cutout(svg, bg="#ffffff"):
    return svg.replace("var(--surface-2,#26262c)", bg).replace(
        "var(--surface-2)", bg)


icons = {
    "posix": web_cutout(app_icon("posix")),
    "ssh": ssh,
    "sftp": sftp,
    "azure-blob": azure,
    "gcs": gcs,
    "s3": s3,
    "dspace": dspace,
    "gdrive": gdrive,
    "irods": irods,
    "postgres": postgres,
    "mariadb": mariadb,
}

out = os.path.join(HERE, "icons.json")
json.dump(icons, open(out, "w", encoding="utf-8"), indent=2)
print("wrote", out, "with", len(icons), "icons")
for k, v in icons.items():
    tag = "PNG" if v.startswith("data:image") else "SVG"
    print(f"  {k:12} {tag}  {len(v)} chars")
