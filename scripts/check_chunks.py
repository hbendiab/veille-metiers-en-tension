"""Quality report of the chunks stored in Supabase (table documents).

Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env (never printed) and uses the REST API only.
Usage: python3 scripts/check_chunks.py [--show N]
"""
import collections
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def load_env():
    values = {}
    for line in (ROOT / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def fetch_rows(env):
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    url = env["SUPABASE_URL"].rstrip("/") + "/rest/v1/documents?select=id,content,metadata,embedding&order=id.asc&limit=5000"
    # curl instead of urllib: some macOS Python builds have no root certificates.
    out = subprocess.run(["curl", "-sS", "-H", "apikey: " + key, "-H", "Authorization: Bearer " + key, url],
                         capture_output=True, text=True, check=True).stdout
    rows = json.loads(out)
    if not isinstance(rows, list):
        raise SystemExit("Erreur Supabase : " + str(rows)[:200])
    return rows


def vector_size(value):
    if isinstance(value, str):
        value = json.loads(value)
    return len(value or [])


def main():
    show = int(sys.argv[sys.argv.index("--show") + 1]) if "--show" in sys.argv else 0
    rows = fetch_rows(load_env())
    print(f"Passages stockés : {len(rows)}")
    if not rows:
        return
    print("Taille des vecteurs :", dict(collections.Counter(vector_size(r["embedding"]) for r in rows)))

    for (book_id, title), count in collections.Counter(
            (r["metadata"].get("bookId"), r["metadata"].get("bookTitle")) for r in rows).items():
        numbers = [r["metadata"].get("passageNumber") for r in rows if r["metadata"].get("bookId") == book_id]
        duplicates = sorted(n for n, c in collections.Counter(numbers).items() if c > 1)
        print(f"\nLivre « {title} » ({book_id}) : {count} passages, n° {min(numbers)} à {max(numbers)}, doublons : {duplicates or 'aucun'}")

    lengths = [len(r["content"].split("\n\n", 1)[-1]) for r in rows]
    print(f"Longueur du texte (hors en-tête) : min {min(lengths)} / moyenne {sum(lengths) // len(lengths)} / max {max(lengths)}")
    text = " ".join(r["content"] for r in rows)
    print("En-têtes de page du Journal officiel restants :", len(re.findall(r"JO L du \d|ELI: http", text)))

    print("\nSections reconnues :")
    for section, count in collections.Counter(r["metadata"].get("chapter") for r in rows).most_common(15):
        print(f"  {count:>4} × {str(section)[:110]}")

    for r in rows[:show]:
        print(f"\n--- id {r['id']} | passage {r['metadata'].get('passageNumber')}")
        print(r["content"][:600])


if __name__ == "__main__":
    main()
