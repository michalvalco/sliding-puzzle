#!/usr/bin/env python3
"""Build a single, self-contained ``sliding-puzzle.html``.

Inlines ``styles.css``, ``script.js`` and every image in ``media/`` (as base64
data URIs) into one HTML file that can be opened or shared offline with no
external assets. Google Fonts stay external and degrade to system fonts offline.

Run from the repository root::

    python scripts/build_standalone.py
"""
import base64
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def data_uri(path: str) -> str:
    """Return a base64 ``data:`` URI for an image file."""
    ext = os.path.splitext(path)[1].lower()
    mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(
        ext, "application/octet-stream"
    )
    with open(path, "rb") as fh:
        return f"data:{mime};base64," + base64.b64encode(fh.read()).decode()


def _read(name: str) -> str:
    with open(os.path.join(ROOT, name), encoding="utf-8") as fh:
        return fh.read()


def main() -> None:
    html = _read("index.html")
    css = _read("styles.css")
    js = _read("script.js")

    media_dir = os.path.join(ROOT, "media")
    media = {
        "media/" + fn: data_uri(os.path.join(media_dir, fn))
        for fn in os.listdir(media_dir)
        if fn.lower().endswith((".png", ".jpg", ".jpeg"))
    }

    html = html.replace(
        '<link rel="stylesheet" href="styles.css">', "<style>\n" + css + "\n</style>"
    )
    html = html.replace(
        '<script src="script.js"></script>', "<script>\n" + js + "\n</script>"
    )
    html = html.replace(
        "<title>",
        "<!-- Standalone single-file build: CSS/JS/images inlined. "
        "Share this file directly. -->\n    <title>",
    )
    # Replace longest refs first so e.g. puzzle-1 doesn't clobber puzzle-10.
    # Only replace quote-delimited *relative* refs ("media/x" or 'media/x') so
    # we don't corrupt absolute URLs that merely contain "media/" — the og:image,
    # twitter:image and schema.org image tags use
    # https://.../sliding-puzzle/media/welcome.png and must be left intact.
    for ref, uri in sorted(media.items(), key=lambda kv: -len(kv[0])):
        html = html.replace('"' + ref + '"', '"' + uri + '"')
        html = html.replace("'" + ref + "'", "'" + uri + "'")

    out = os.path.join(ROOT, "sliding-puzzle.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    # Count only un-inlined *relative* refs; the 3 absolute social-image URLs
    # legitimately still contain "/media/" and are expected to remain.
    remaining = html.count('"media/') + html.count("'media/")
    print(
        f"Wrote {out} ({os.path.getsize(out) // 1024} KB); "
        f"remaining relative media/ refs: {remaining}"
    )


if __name__ == "__main__":
    main()
