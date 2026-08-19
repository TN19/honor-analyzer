"""Baixa retratos oficiais do Honor of Kings e gera WebP quadrado para o frontend."""

from __future__ import annotations

import io
import json
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "heroes"
CAMP_HERO_PAGE = "https://camp.honorofkings.com/h5/app/index.html#/hero-homepage"
HERO_IDS = {
    "angela": 142, "ao-yin": 519, "arli": 199, "ata": 556, "augran": 517,
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
CAMP_IMAGES = {
    "angela": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/wjaExUFU.png",
    "ao-yin": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/OzH2TSZN.jpg",
    "arli": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/hF8AFVqh.png",
    "ata": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/eafz1moy.png",
    "augran": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/ue6KY05b.png",
    "biron": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/F3A0JkoT.png",
    "cai-yan": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/kQXkW7ab.png",
    "chano": "https://camp.honorofkings.com/camp/admin/default/sJURXorM.png",
    "charlotte": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/iIwO0Kwk.png",
    "da-qiao": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/IEPtzR5z.png",
    "dolia": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/tfvb3IJf.png",
    "donghuang": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/PRcq49iS.png",
    "dun": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/23rrkYYy.png",
    "dyadia": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/Qdvu6qgO.png",
    "erin": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/joVNQWhw.png",
    "faith": "https://camp.honorofkings.com/camp/admin/default/6IY77h7c.png",
    "feyd": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/m8aOqFQE.png",
    "flowborn-marksman": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/WuG07My1.jpeg",
    "flowborn-tank": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/jbrX5mQc.jpeg",
    "fuzi": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/UhQkVUBi.png",
    "garuda": "https://camp.honorofkings.com/camp/admin/default/h6UHy1TN.png",
    "guan-yu": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/V5e2k18Z.png",
    "guiguzi": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/AXjJlMvi.png",
    "haya": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/iIdXNhQ5.png",
    "jing": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/HVRw4cpB.png",
    "kaizer": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/xUdtJiLO.png",
    "lady-sun": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/BmY46Zgb.png",
    "lady-zhen": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/gqPEOybC.png",
    "lapu-lapu": "https://camp.honorofkings.com/camp/admin/default/AuWJ7G0J.png",
    "lian-po": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/csLOp1dL.png",
    "liang": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/cNugkXGO.png",
    "mai-shiranui": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/4jaM0F19.png",
    "menki": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/Ym7KcrIW.png",
    "nakoruru": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/H9WAmWdN.png",
    "nezha": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/WDh84DWg.png",
    "nuwa": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/E39kxNsD.png",
    "pei": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/XlRczGYM.png",
    "shouyue": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/4bUKKH66.png",
    "sun-ce": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/Te1nmDGP.png",
    "umbrosa": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/ioDVAbAf.jpg",
    "wang-zhaojun": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/lhZtGJlg.png",
    "yang-jian": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/LntokS4z.png",
    "yuhuan": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/r97AVgaV.png",
    "zhuangzi": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/UZC54GWu.png",
}


def request_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 BP-Analyzer/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def convert_portrait(data: bytes, destination: Path) -> tuple[int, int]:
    with Image.open(io.BytesIO(data)) as source:
        portrait = source.convert("RGBA")
        canvas = ImageOps.fit(
            portrait,
            (512, 512),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.38),
        )
        canvas.save(destination, "WEBP", quality=90, method=6)
        return source.size


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for slug, hero_id in HERO_IDS.items():
        image_url = CAMP_IMAGES[slug]
        original_size = convert_portrait(request_bytes(image_url), OUTPUT / f"{slug}.webp")
        manifest.append({
            "heroId": slug,
            "officialHeroId": hero_id,
            "sourcePage": CAMP_HERO_PAGE,
            "sourceImage": image_url,
            "originalSize": list(original_size),
            "output": f"/heroes/{slug}.webp",
        })
        print(f"{slug}: {original_size[0]}x{original_size[1]} -> 512x512 WebP")
    (OUTPUT / "sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Concluído: {len(manifest)} retratos em {OUTPUT}")


if __name__ == "__main__":
    main()
