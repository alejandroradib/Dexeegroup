#!/usr/bin/env python3
"""Merge a namespace JSON file into messages/<locale>.json (used during development)."""
import json, sys
locale, namespace, src = sys.argv[1], sys.argv[2], sys.argv[3]
p = f"messages/{locale}.json"
data = json.load(open(p, encoding="utf-8"))
addition = json.load(open(src, encoding="utf-8"))
existing = data.get(namespace, {})
def deep(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict): deep(a[k], v)
        else: a[k] = v
    return a
data[namespace] = deep(existing, addition)
json.dump(data, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(p, "a", encoding="utf-8").write("\n")
print(f"merged {namespace} into {p}")
