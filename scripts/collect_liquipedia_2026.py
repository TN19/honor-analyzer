#!/usr/bin/env python3
"""Collect complete 2026 HoK map drafts from Liquipedia wikitext.

This archive is intentionally observational. It does not calculate draft advice.
"""

from __future__ import annotations

import argparse
import gzip
import json
import re
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

API = "https://liquipedia.net/honorofkings/api.php"
USER_AGENT = "honor-analyzer/0.1 (github.com/TN19/honor-analyzer; historical research)"

ALIASES = {
    "ao'yin": "ao-yin", "lapulapu": "lapu-lapu", "lian po": "lian-po",
    "mai shiranui": "mai-shiranui", "ukyo tachibana": "ukyo-tachibana",
    "wang zhaojun": "wang-zhaojun", "xiao qiao": "xiao-qiao",
    "zhang fei": "zhang-fei", "guan yu": "guan-yu", "sun ce": "sun-ce",
    "mi yue": "mi-yue", "gan & mo": "gan-mo", "xiang yu": "xiang-yu",
    "bai qi": "bai-qi", "liu bang": "liu-bang", "fatih": "faith",
    "kai": "kaizer", "flowborn (tank)": "flowborn-tank",
    "flowborn (marksman)": "flowborn-marksman",
}


def canonical_hero(value: str) -> str:
    clean = value.strip().lower()
    if clean in ALIASES:
        return ALIASES[clean]
    return re.sub(r"[^a-z0-9]+", "-", clean).strip("-")


def fetch_wikitext(page: str) -> str:
    query = urllib.parse.urlencode({"action": "parse", "page": page, "prop": "wikitext", "format": "json"})
    request = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = response.read()
        if response.headers.get("Content-Encoding") == "gzip":
            payload = gzip.decompress(payload)
        return json.loads(payload)["parse"]["wikitext"]["*"]


def balanced_template(text: str, start: int) -> str:
    depth, cursor = 0, start
    while cursor < len(text) - 1:
        pair = text[cursor:cursor + 2]
        if pair == "{{":
            depth += 1
            cursor += 2
            continue
        if pair == "}}":
            depth -= 1
            cursor += 2
            if depth == 0:
                return text[start:cursor]
            continue
        cursor += 1
    raise ValueError("Unclosed template")


def value(template: str, key: str) -> str | None:
    match = re.search(rf"\|\s*{re.escape(key)}\s*=\s*([^|\n}}]+)", template, re.I)
    return match.group(1).strip() if match else None


def team_name(match_template: str, number: int) -> str:
    nested = re.search(rf"\|\s*opponent{number}\s*=\s*{{{{TeamOpponent\s*\|\s*([^|}}\n]+)", match_template, re.I)
    if nested:
        return nested.group(1).strip()
    return (value(match_template, f"opponent{number}") or f"team-{number}").strip()


def collect(page: str, tournament_id: str, tournament: str, stage: str, region: str) -> dict:
    text = fetch_wikitext(page)
    series, skipped = [], 0
    match_starts = list(re.finditer(r"{{Match\s*(?:\n|\|)", text, re.I))
    for series_number, match_start in enumerate(match_starts, 1):
        match = balanced_template(text, match_start.start())
        team1, team2 = team_name(match, 1), team_name(match, 2)
        games = []
        for map_match in re.finditer(r"\|\s*map(\d+)\s*=\s*({{Map\s*(?:\n|\|))", match, re.I):
            game_number = int(map_match.group(1))
            map_template = balanced_template(match, map_match.start(2))
            if value(map_template, "finished") == "skip":
                continue
            side1, side2, winner_raw = value(map_template, "team1side"), value(map_template, "team2side"), value(map_template, "winner")
            picks1 = [value(map_template, f"t1h{i}") for i in range(1, 6)]
            picks2 = [value(map_template, f"t2h{i}") for i in range(1, 6)]
            bans1 = [value(map_template, f"t1b{i}") for i in range(1, 5)]
            bans2 = [value(map_template, f"t2b{i}") for i in range(1, 5)]
            if side1 not in {"blue", "red"} or side2 not in {"blue", "red"} or winner_raw not in {"1", "2"} or not all(picks1 + picks2 + bans1 + bans2):
                skipped += 1
                continue
            drafts = {
                side1: {"team": team1, "picks": [canonical_hero(x) for x in picks1], "bans": [canonical_hero(x) for x in bans1]},
                side2: {"team": team2, "picks": [canonical_hero(x) for x in picks2], "bans": [canonical_hero(x) for x in bans2]},
            }
            winner_team = team1 if winner_raw == "1" else team2
            winner_side = side1 if winner_raw == "1" else side2
            games.append({
                "id": f"{tournament_id}-s{series_number:02d}-g{game_number}",
                "gameInSeries": game_number,
                "duration": value(map_template, "length"),
                "winnerTeam": winner_team,
                "winnerSide": winner_side,
                "finalObjective": {"winnerConfirmed": True, "endingMethod": "unknown"},
                "draft": {"blue": drafts["blue"], "red": drafts["red"]},
                "bpMetadata": {"complete": True, "banOrderVerified": False, "pickOrder": "source-slot-order"},
                "vod": value(map_template, "vod"),
            })
        if games:
            wins1 = sum(game["winnerTeam"] == team1 for game in games)
            wins2 = sum(game["winnerTeam"] == team2 for game in games)
            raw_date = value(match, "date")
            series.append({
                "id": f"{tournament_id}-s{series_number:02d}",
                "dateRaw": raw_date.split("{{", 1)[0].strip() if raw_date else None,
                "teams": [{"name": team1, "region": region}, {"name": team2, "region": region}],
                "finalScore": {team1: wins1, team2: wins2},
                "winnerTeam": team1 if wins1 > wins2 else team2,
                "games": games,
            })
    return {
        "schemaVersion": 1,
        "generatedAt": date.today().isoformat(),
        "tournament": {"id": tournament_id, "name": tournament, "year": 2026, "stage": stage, "region": region},
        "source": {"provider": "Liquipedia", "page": page, "url": f"https://liquipedia.net/honorofkings/{page.replace(' ', '_')}"},
        "analysisPolicy": {"eligible": False, "reason": "歷史資料僅供記錄；未經使用者批准不得進入推薦引擎。"},
        "coverage": {"series": len(series), "gamesWithCompleteBp": sum(len(item["games"]) for item in series), "skippedIncompleteGames": skipped},
        "series": series,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--page", required=True)
    parser.add_argument("--tournament-id", required=True)
    parser.add_argument("--tournament", required=True)
    parser.add_argument("--stage", required=True)
    parser.add_argument("--region", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    archive = collect(args.page, args.tournament_id, args.tournament, args.stage, args.region)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(archive["coverage"], ensure_ascii=False))


if __name__ == "__main__":
    main()
