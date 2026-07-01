#!/usr/bin/env python3

from pathlib import Path
import re

# 匹配 figure.liquid，并提取 path
pattern = re.compile(
    r'{%\s*include\s+figure\.liquid\b[^%]*?\bpath="([^"]+)"[^%]*?%}',
    re.DOTALL,
)

extensions = {".md", ".markdown", ".mdx"}

for file in Path(".").rglob("*"):
    if file.suffix.lower() not in extensions:
        continue

    text = file.read_text(encoding="utf-8")

    new_text = pattern.sub(r'![](\1)', text)

    if new_text != text:
        file.write_text(new_text, encoding="utf-8")
        print(f"Updated: {file}")