#!/usr/bin/env python3
"""Validate the record-only professional match archive for 2026."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def validate(archive_dir: Path) -> dict:
    source_catalog = json.loads((archive_dir / "sources.json").read_text(encoding="utf-8"))
    known_regions = {region["id"] for region in source_catalog["regions"]}
    threshold = source_catalog["minimumCompleteGamesBeforeBpAnalysis"]
    totals = defaultdict(lambda: {"tournaments": 0, "series": 0, "completeGames": 0, "skippedIncompleteGames": 0})
    seen_series: set[str] = set()
    seen_games: set[str] = set()
    errors: list[str] = []

    for path in sorted(archive_dir.glob("*.json")):
        if path.name in {"sources.json", "coverage.json"}:
            continue
        archive = json.loads(path.read_text(encoding="utf-8"))
        region = archive.get("tournament", {}).get("region")
        if region not in known_regions:
            errors.append(f"{path.name}: unknown region {region!r}")
            continue
        if archive.get("analysisPolicy", {}).get("eligible") is not False:
            errors.append(f"{path.name}: archive must remain analysis-ineligible")
        region_total = totals[region]
        region_total["tournaments"] += 1
        region_total["skippedIncompleteGames"] += archive.get("coverage", {}).get("skippedIncompleteGames", 0)
        for series in archive.get("series", []):
            series_id = series.get("id")
            if not series_id or series_id in seen_series:
                errors.append(f"{path.name}: invalid or duplicate series id {series_id!r}")
            seen_series.add(series_id)
            region_total["series"] += 1
            teams = {team.get("name") for team in series.get("teams", [])}
            if len(teams) != 2 or any(not team or "{{" in team for team in teams):
                errors.append(f"{series_id}: expected two parsed team names")
            for game in series.get("games", []):
                game_id = game.get("id")
                if not game_id or game_id in seen_games:
                    errors.append(f"{path.name}: invalid or duplicate game id {game_id!r}")
                seen_games.add(game_id)
                blue, red = game.get("draft", {}).get("blue", {}), game.get("draft", {}).get("red", {})
                if len(blue.get("picks", [])) != 5 or len(red.get("picks", [])) != 5:
                    errors.append(f"{game_id}: expected five picks per side")
                if len(blue.get("bans", [])) != 4 or len(red.get("bans", [])) != 4:
                    errors.append(f"{game_id}: expected four bans per side")
                if game.get("winnerSide") not in {"blue", "red"}:
                    errors.append(f"{game_id}: invalid winner side")
                if game.get("winnerTeam") not in teams:
                    errors.append(f"{game_id}: winner is not part of the series")
                if not game.get("finalObjective", {}).get("winnerConfirmed"):
                    errors.append(f"{game_id}: final objective result is not confirmed")
                region_total["completeGames"] += 1

    regions = []
    for region in source_catalog["regions"]:
        item = {"id": region["id"], "labelZhHant": region["labelZhHant"], **totals[region["id"]]}
        item["sampleThresholdReached"] = item["completeGames"] >= threshold
        item["analysisEligible"] = False
        regions.append(item)
    summary = {
        "year": 2026,
        "policy": "record-only",
        "minimumCompleteGamesBeforeReview": threshold,
        "totals": {
            "regionsWithGames": sum(item["completeGames"] > 0 for item in regions),
            "series": sum(item["series"] for item in regions),
            "completeGames": sum(item["completeGames"] for item in regions),
            "skippedIncompleteGames": sum(item["skippedIncompleteGames"] for item in regions),
        },
        "regions": regions,
    }
    if errors:
        raise SystemExit("\n".join(errors))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive-dir", type=Path, default=Path("src/data/matches/2026"))
    parser.add_argument("--write-summary", action="store_true")
    args = parser.parse_args()
    summary = validate(args.archive_dir)
    if args.write_summary:
        (args.archive_dir / "coverage.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary["totals"], ensure_ascii=False))


if __name__ == "__main__":
    main()
