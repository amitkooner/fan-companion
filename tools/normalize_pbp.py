"""
normalize_pbp.py — Convert nbadb SQLite play-by-play data into the
Tentpole Fan Companion PLAYS[] JSON schema.

Usage:
    python normalize_pbp.py --db nba.sqlite --game-id 0022100414 --out plays.json

Prerequisites:
    pip install sqlite3 (stdlib)

Data source:
    Download nba.sqlite from https://www.kaggle.com/datasets/wyattowalsh/basketball
    The database contains play-by-play data for every NBA game since 1996-97.
"""

import sqlite3
import json
import argparse
import re
from pathlib import Path

# ============================================================
# NBA Stats API event message types
# ============================================================
EVENT_TYPES = {
    1: "made_shot",
    2: "missed_shot",
    3: "free_throw",
    4: "rebound",
    5: "turnover",
    6: "foul",
    7: "violation",
    8: "substitution",
    9: "timeout",
    10: "jump_ball",
    12: "start_period",
    13: "end_period",
    18: "instant_replay",
    20: "stoppage",
}

# ============================================================
# Jargon detection patterns
# ============================================================
JARGON_PATTERNS = {
    "alley-oop": r"alley[\s-]?oop",
    "fadeaway": r"fadeaway|fade[\s-]?away",
    "step-back": r"step[\s-]?back",
    "hook shot": r"hook\s+shot",
    "floater": r"floater|floating",
    "dunk": r"\bdunk\b",
    "reverse layup": r"reverse\s+layup",
    "pull-up": r"pull[\s-]?up",
    "turnaround": r"turnaround|turn[\s-]?around",
    "finger roll": r"finger\s+roll",
    "bank shot": r"bank\s+shot",
    "tip-in": r"tip[\s-]?in",
    "putback": r"putback|put[\s-]?back",
    "fast break": r"fast\s+break",
    "transition": r"transition",
}

# ============================================================
# Known player name → key mappings (extend per game)
# ============================================================
# You can auto-generate this from the roster or pass it in.
# Format: { "Stephen Curry": "curry", "Julius Randle": "randle", ... }


def detect_jargon(description: str) -> str | None:
    """Scan a play description for basketball jargon."""
    desc_lower = description.lower()
    for term, pattern in JARGON_PATTERNS.items():
        if re.search(pattern, desc_lower):
            return term
    return None


def parse_score(score_str: str) -> tuple[int, int]:
    """Parse '45 - 38' into (away_score, home_score).
    
    nba.com convention: the score column shows 'AWAY - HOME'.
    If the score is missing/null, returns (0, 0).
    """
    if not score_str or not isinstance(score_str, str):
        return (0, 0)
    parts = score_str.strip().split("-")
    if len(parts) != 2:
        return (0, 0)
    try:
        return (int(parts[0].strip()), int(parts[1].strip()))
    except ValueError:
        return (0, 0)


def classify_play_type(event_type: int, description: str) -> str:
    """Map NBA event type + description to our simplified type enum."""
    desc_lower = description.lower() if description else ""

    if event_type == 1:  # Made shot
        if "3pt" in desc_lower or "3-pt" in desc_lower or "three point" in desc_lower:
            return "fg3"
        return "fg"
    elif event_type == 2:  # Missed shot
        if "3pt" in desc_lower or "3-pt" in desc_lower or "three point" in desc_lower:
            return "miss3"
        return "miss"
    elif event_type == 3:  # Free throw
        return "ft"
    elif event_type == 4:
        return "rebound"
    elif event_type == 5:
        return "turnover"
    elif event_type == 6:
        return "foul"
    elif event_type == 9:
        return "timeout"
    elif event_type == 10:
        return "jumpball"
    elif event_type == 12:
        return "period_start"
    elif event_type == 13:
        return "quarter_end"
    else:
        return "other"


def build_description(home_desc: str | None, away_desc: str | None,
                      neutral_desc: str | None) -> str:
    """Combine the three description columns into a single play description."""
    parts = [d.strip() for d in [away_desc, home_desc, neutral_desc] if d and d.strip()]
    return " | ".join(parts) if parts else "Play"


def extract_player_name(player1_name: str | None) -> str | None:
    """Extract and clean the primary player name."""
    if not player1_name or not isinstance(player1_name, str):
        return None
    name = player1_name.strip()
    return name if name else None


def normalize_game(db_path: str, game_id: str,
                   player_keys: dict[str, str] | None = None,
                   milestones: list[dict] | None = None,
                   scoring_only: bool = False) -> list[dict]:
    """
    Query the nbadb SQLite database and normalize play-by-play into
    the PLAYS[] JSON schema for the Fan Companion app.

    Args:
        db_path: Path to the nba.sqlite file
        game_id: NBA game ID (e.g., '0022100414')
        player_keys: Optional mapping of "Full Name" → "key" for the
                      PLAYERS{} dict (e.g., {"Stephen Curry": "curry"})
        milestones: Optional list of milestone dicts to attach at specific
                    event numbers: [{"event_num": 42, "type": "record_break",
                    "text": "...", "threeCount": 2974}]
        scoring_only: If True, filter to only scoring plays + key events
                      (timeouts, quarter ends). Good for demo-length games.

    Returns:
        List of normalized play dicts matching the PLAYS[] schema.
    """
    if player_keys is None:
        player_keys = {}

    milestone_map = {}
    if milestones:
        for m in milestones:
            milestone_map[m["event_num"]] = {
                k: v for k, v in m.items() if k != "event_num"
            }

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    # The nbadb schema uses the table 'play_by_play' with these key columns.
    # Adjust column names if your version of the DB differs.
    query = """
        SELECT
            EVENTNUM,
            EVENTMSGTYPE,
            PERIOD,
            PCTIMESTRING,
            HOMEDESCRIPTION,
            VISITORDESCRIPTION,
            NEUTRALDESCRIPTION,
            SCORE,
            PLAYER1_NAME,
            PLAYER1_TEAM_ABBREVIATION,
            PLAYER2_NAME,
            PLAYER3_NAME
        FROM play_by_play
        WHERE GAME_ID = ?
        ORDER BY PERIOD ASC, EVENTNUM ASC
    """

    cursor = conn.execute(query, (game_id,))
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        # Try alternate table name used in some nbadb versions
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        alt_query = query.replace("play_by_play", "pbp")
        try:
            cursor = conn.execute(alt_query, (game_id,))
            rows = cursor.fetchall()
        except sqlite3.OperationalError:
            pass
        conn.close()

    if not rows:
        print(f"No play-by-play data found for game_id={game_id}")
        print("Available tables can be checked with:")
        print("  sqlite3 nba.sqlite '.tables'")
        return []

    print(f"Found {len(rows)} raw plays for game {game_id}")

    # Track running score (the SCORE column can be sparse)
    last_away, last_home = 0, 0
    plays = []

    for row in rows:
        event_num = row["EVENTNUM"]
        event_type = row["EVENTMSGTYPE"]
        period = row["PERIOD"]
        clock = row["PCTIMESTRING"] or "0:00"
        score_str = row["SCORE"]
        player_name = extract_player_name(row["PLAYER1_NAME"])
        home_desc = row["HOMEDESCRIPTION"]
        away_desc = row["VISITORDESCRIPTION"]
        neutral_desc = row["NEUTRALDESCRIPTION"]

        # Parse score — update running total
        if score_str:
            parsed = parse_score(score_str)
            if parsed != (0, 0):
                last_away, last_home = parsed

        # Build description
        desc = build_description(home_desc, away_desc, neutral_desc)

        # Classify play type
        play_type = classify_play_type(event_type, desc)

        # Filter if scoring_only mode
        if scoring_only:
            keep_types = {"fg", "fg3", "ft", "miss3", "timeout",
                          "quarter_end", "period_start", "jumpball"}
            if play_type not in keep_types:
                # Still keep milestone plays
                if event_num not in milestone_map:
                    continue

        # Detect jargon
        jargon = detect_jargon(desc)

        # Map player to key
        player_key = None
        if player_name:
            player_key = player_keys.get(player_name)

        # Build the normalized play
        play = {
            "q": period,
            "time": clock,
            "away": last_away,
            "home": last_home,
            "desc": desc,
            "player": player_key,
            "type": play_type,
        }

        if jargon:
            play["jargon"] = jargon

        # Attach milestone if flagged
        if event_num in milestone_map:
            play["milestone"] = milestone_map[event_num]

        plays.append(play)

    print(f"Normalized to {len(plays)} plays"
          f"{' (scoring only)' if scoring_only else ''}")
    return plays


def main():
    parser = argparse.ArgumentParser(
        description="Normalize nbadb play-by-play into Fan Companion JSON"
    )
    parser.add_argument("--db", required=True, help="Path to nba.sqlite")
    parser.add_argument("--game-id", required=True, help="NBA game ID")
    parser.add_argument("--out", default="plays.json", help="Output JSON path")
    parser.add_argument("--scoring-only", action="store_true",
                        help="Filter to scoring plays only (smaller output)")
    parser.add_argument("--player-map", default=None,
                        help="JSON file mapping player names to keys")
    parser.add_argument("--milestones", default=None,
                        help="JSON file with milestone definitions")

    args = parser.parse_args()

    # Load player map if provided
    player_keys = {}
    if args.player_map:
        with open(args.player_map) as f:
            player_keys = json.load(f)

    # Load milestones if provided
    milestones = None
    if args.milestones:
        with open(args.milestones) as f:
            milestones = json.load(f)

    plays = normalize_game(
        db_path=args.db,
        game_id=args.game_id,
        player_keys=player_keys,
        milestones=milestones,
        scoring_only=args.scoring_only,
    )

    out_path = Path(args.out)
    with open(out_path, "w") as f:
        json.dump(plays, f, indent=2)

    print(f"Wrote {len(plays)} plays to {out_path}")


# ============================================================
# Example: Curry record-breaking game
# ============================================================
# Save this as curry_players.json:
# {
#   "Stephen Curry": "curry",
#   "Julius Randle": "randle",
#   "Andrew Wiggins": "wiggins",
#   "Jordan Poole": "poole",
#   "Alec Burks": "burks"
# }
#
# Save this as curry_milestones.json:
# [
#   {
#     "event_num": 42,
#     "type": "record_tie",
#     "threeCount": 2973,
#     "text": "Curry has TIED Ray Allen's all-time record (2,973)!"
#   },
#   {
#     "event_num": 68,
#     "type": "record_break",
#     "threeCount": 2974,
#     "text": "HISTORY! Curry breaks the record with career three #2,974!"
#   }
# ]
#
# Then run:
# python normalize_pbp.py \
#   --db nba.sqlite \
#   --game-id 0022100414 \
#   --player-map curry_players.json \
#   --milestones curry_milestones.json \
#   --scoring-only \
#   --out plays_curry_record.json

if __name__ == "__main__":
    main()
