"""Update stylesheet and script version hashes after editing the static site."""

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def versioned_path(url):
    path = url.split("?", 1)[0]
    digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
    return f"{path}?v={digest[:10]}"


def main():
    entry = ROOT / "index.html"
    html = entry.read_text(encoding="utf-8")
    asset_tag = r'(<script defer src="|<link rel="stylesheet" href=")([^"]+)(")'
    updated = re.sub(
        asset_tag,
        lambda match: match[1] + versioned_path(match[2]) + match[3],
        html,
    )
    viewer = r'(<script id="viewer-assets" type="application/json">)([^<]*)(</script>)'
    updated = re.sub(
        viewer,
        lambda match: match[1]
        + json.dumps([versioned_path(url) for url in json.loads(match[2])])
        + match[3],
        updated,
    )
    if updated != html:
        entry.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    main()
