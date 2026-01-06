#!/usr/bin/env python3
"""
Simple asset scanner for the Godot project.

Usage: python3 tools/scan_assets.py

Scans .tscn and .gd files for `res://` references and compares them to files
found under the `assets/` directory. Prints referenced resources, missing
resources, and unreferenced files inside `assets/`.
"""
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"

RES_PATTERN = re.compile(r"res://[A-Za-z0-9_./\-]+")


def gather_references():
    refs = set()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # skip .godot/imported and .import if present
        if ".godot" in dirpath:
            continue
        for fn in filenames:
            if fn.endswith((".tscn", ".gd", ".import", ".tres", ".res")):
                p = Path(dirpath) / fn
                try:
                    text = p.read_text(encoding="utf-8")
                except Exception:
                    continue
                for m in RES_PATTERN.findall(text):
                    refs.add(m)
    return refs


def list_assets():
    files = set()
    if not ASSETS_DIR.exists():
        return files
    for p in ASSETS_DIR.rglob("*"):
        if p.is_file():
            # convert to res path relative to project root
            rel = p.relative_to(ROOT).as_posix()
            files.add("res://" + rel)
    return files


def main():
    print(f"Scanning project at: {ROOT}")
    refs = gather_references()
    assets = list_assets()

    print(f"Found {len(refs)} referenced res:// paths in scenes/scripts.")
    print("-- Sample referenced paths --")
    for p in sorted(list(refs))[:30]:
        print(p)

    if assets:
        print(f"\nFound {len(assets)} files under assets/ to check.")
        unreferenced = sorted([a for a in assets if a not in refs])
        missing = sorted([r for r in refs if r.startswith("res://assets/") and not (ROOT / r[6:]).exists()])

        print(f"\nUnreferenced assets ({len(unreferenced)}):")
        for a in unreferenced[:100]:
            print(a)

        if missing:
            print(f"\nMissing asset files referenced ({len(missing)}):")
            for m in missing:
                print(m)
    else:
        print("\nNo assets/ directory found or it is empty.")


if __name__ == "__main__":
    main()
