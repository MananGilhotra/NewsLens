"""
Builds backend/data/domain-reliability.json from the News Media Reliability dataset
(Burdisso et al., "Reliability Estimation of News Media Sources: Birds of a Feather Flock Together",
NAACL 2024, Apache-2.0): 5.3k news domains labelled reliable (1), mixed (0) or unreliable (-1),
with a NewsGuard score for a subset.

Usage: python build_source_index.py
"""

import csv
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "data" / "news_media_reliability.csv"
URL = "https://huggingface.co/datasets/sergioburdisso/news_media_reliability/resolve/main/data.csv"
OUT = ROOT.parent / "backend" / "data" / "domain-reliability.json"


def main():
    if not SOURCE.exists():
        SOURCE.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, SOURCE)
    domains = {}
    with SOURCE.open() as f:
        for row in csv.DictReader(f):
            score = row["newsguard_score"]
            domains[row["domain"].strip().lower()] = [int(row["reliability_label"]), round(float(score)) if score else None]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "News Media Reliability dataset - Burdisso et al., NAACL 2024 (Apache-2.0)",
        "url": "https://huggingface.co/datasets/sergioburdisso/news_media_reliability",
        "format": "domain -> [label (1 reliable, 0 mixed, -1 unreliable), NewsGuard score or null]",
        "domains": domains,
    }, separators=(",", ":")))
    print(f"wrote {OUT} ({len(domains)} domains, {OUT.stat().st_size / 1e3:.0f} KB)")


if __name__ == "__main__":
    main()
