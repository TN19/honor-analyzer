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
    "zhang-fei": 171, "di-renjie": 133, "gan-mo": 182, "lam": 528,
    "heino": 509, "lu-bu": 123, "ukyo-tachibana": 163, "agudo": 533,
    "consort-yu": 174, "shi": 523, "xiao-qiao": 106, "hou-yi": 169,
    "sakeer": 534, "devara": 537, "bai-qi": 120, "chicha": 172,
    "mi-yue": 121, "allain": 514, "xiang-yu": 135, "dharma": 134,
    "fang": 173, "ying": 538, "zilong": 107, "musashi": 130,
    "sun-bin": 118, "garo": 508, "mozi": 108, "ji-xiaoman": 507,
    "meng-ya": 524, "milady": 504, "zhou-yu": 124, "dr-bian": 119,
    "dian-wei": 129, "luna": 146, "han-xin": 150, "prince-of-lanling": 153,
    "florentino": 631, "ziya": 148, "lorion": 635, "annette": 640, "kui": 175,
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
    "zhang-fei": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/w0QS7N1L.png",
    "di-renjie": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/XTSDAJkR.png",
    "gan-mo": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/ui5UKQex.png",
    "lam": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/02i6M2YK.png",
    "heino": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/YO6iwLAg.jpg",
    "lu-bu": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/dXLF2kE7.png",
    "ukyo-tachibana": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/8e9WRFgL.png",
    "agudo": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/TYN9rh81.png",
    "consort-yu": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/Ku5RzFmQ.png",
    "shi": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/MjBadKpJ.png",
    "xiao-qiao": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/paTVVlNq.png",
    "hou-yi": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/S5isJokI.png",
    "sakeer": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/ionwVFtV.png",
    "devara": "https://camp.honorofkings.com/camp/admin/default/MagzAk8i.png",
    "bai-qi": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/uY7c38Tt.png",
    "chicha": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/lkU98jAV.png",
    "mi-yue": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/eHvcCJb0.png",
    "allain": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/Ek9OHopQ.png",
    "xiang-yu": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/FLyy9J46.png",
    "dharma": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/9u997w0x.png",
    "fang": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/6dGNjKTe.png",
    "ying": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/diRuUQDV.png",
    "zilong": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/9xqbsAQC.png",
    "musashi": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/jgvSlz3u.png",
    "sun-bin": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/1zkBQ1l1.png",
    "garo": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/g0jHNDf6.png",
    "mozi": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/Za4OlJ6t.png",
    "ji-xiaoman": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/FsGXCnH1.png",
    "meng-ya": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/vhBTA9jh.png",
    "milady": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/orlOit3f.png",
    "zhou-yu": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/kqkpA18w.png",
    "dr-bian": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/YmpeG9H2.png",
    "dian-wei": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/y6IMFSlI.png",
    "luna": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/hz3BqNue.png",
    "han-xin": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/QTcSGEgM.png",
    "prince-of-lanling": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/hwk1ad6d.png",
    "florentino": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/skJXGWLF.png",
    "ziya": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/km2HzQ71.png",
    "lorion": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/UDiFFfId.png",
    "annette": "https://camp.honorofkings.com/camp/admin/hero/head_128-128/49o0xBua.png",
    "kui": "https://camp.honorofkings.com/social/game/src/image_hero_head_128*128/wRGzV266.png",
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
