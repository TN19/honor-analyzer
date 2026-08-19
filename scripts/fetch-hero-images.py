"""Baixa retratos oficiais do Honor of Kings e gera WebP quadrado para o frontend."""

from __future__ import annotations

import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "heroes"
OFFICIAL_PAGE = "https://world.honorofkings.com/zlkdatasys/ip/hero/en/{hero_id}.html"
HERO_IDS = {
    "angela": 142, "ao-yin": 519, "arli": 199, "ata": 511, "augran": 517,
    "biron": 503, "cai-yan": 184, "chano": 177, "charlotte": 536,
    "da-qiao": 191, "dolia": 159, "donghuang": 187, "dun": 126,
    "dyadia": 577, "erin": 155, "faith": 128, "feyd": 542,
    "flowborn-marksman": 584, "flowborn-tank": 581, "fuzi": 139,
    "garuda": 110, "guan-yu": 140, "guiguzi": 189, "haya": 521,
    "jing": 531, "kaizer": 193, "lady-sun": 111, "lady-zhen": 127,
    "lapu-lapu": 168, "lian-po": 105, "liang": 156, "mai-shiranui": 157,
    "menki": 198, "nakoruru": 162, "nezha": 180, "nuwa": 179,
    "pei": 502, "shouyue": 196, "sun-ce": 510, "umbrosa": 558,
    "wang-zhaojun": 152, "yang-jian": 178, "yuhuan": 176, "zhuangzi": 113,
}


def request_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 BP-Analyzer/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def find_portrait(page_url: str, html: str, hero_id: int) -> str:
    assets = re.findall(r"[^\"']+\.(?:png|jpg|jpeg|webp)", html, flags=re.IGNORECASE)
    candidates = [asset for asset in assets if "/zlkdatasys/ip/hero/" in asset and asset.lower().endswith(".png")]
    if not candidates and hero_id in {581, 584}:
        return f"https://game.gtimg.cn/images/yxzj/img201606/heroimg/{hero_id}/{hero_id}.jpg"
    if not candidates:
        raise RuntimeError(f"Retrato oficial não encontrado em {page_url}")
    return urllib.parse.urljoin(page_url, candidates[0])


def convert_portrait(data: bytes, destination: Path) -> tuple[int, int]:
    with Image.open(io.BytesIO(data)) as source:
        portrait = source.convert("RGBA")
        scale = min(512 / portrait.width, 512 / portrait.height)
        portrait = portrait.resize((round(portrait.width * scale), round(portrait.height * scale)), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        canvas.alpha_composite(portrait, ((512 - portrait.width) // 2, (512 - portrait.height) // 2))
        canvas.save(destination, "WEBP", quality=90, method=6)
        return source.size


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for slug, hero_id in HERO_IDS.items():
        page_url = OFFICIAL_PAGE.format(hero_id=hero_id)
        html = request_bytes(page_url).decode("utf-8", errors="replace")
        image_url = find_portrait(page_url, html, hero_id)
        original_size = convert_portrait(request_bytes(image_url), OUTPUT / f"{slug}.webp")
        manifest.append({
            "heroId": slug,
            "officialHeroId": hero_id,
            "sourcePage": page_url,
            "sourceImage": image_url,
            "originalSize": list(original_size),
            "output": f"/heroes/{slug}.webp",
        })
        print(f"{slug}: {original_size[0]}x{original_size[1]} -> 512x512 WebP")
    (OUTPUT / "sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Concluído: {len(manifest)} retratos em {OUTPUT}")


if __name__ == "__main__":
    main()
