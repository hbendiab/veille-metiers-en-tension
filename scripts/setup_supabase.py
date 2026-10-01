"""Creates the Supabase vector table (supabase/setup.sql) and checks the installation.

Reads SUPABASE_DB_URL, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env; never prints them.
Requires: pip install "psycopg[binary]" certifi
"""
import json
import pathlib
import ssl
import urllib.parse
import urllib.request

import psycopg

ROOT = pathlib.Path(__file__).resolve().parent.parent


def load_env():
    values = {}
    for line in (ROOT / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def safe_db_url(url):
    """Percent-encodes the password so characters such as @ # / : do not break the URL."""
    scheme, sep, rest = url.partition("://")
    credentials, at, host = rest.rpartition("@")
    if not sep or not at or ":" not in credentials:
        return url
    user, _, password = credentials.partition(":")
    return f"{scheme}://{user}:{urllib.parse.quote(urllib.parse.unquote(password), safe='')}@{host}"


def main():
    env = load_env()
    for key in ("SUPABASE_DB_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if not env.get(key):
            raise SystemExit(f"{key} manquant dans .env")

    # 1. Create extension, table, index and search function.
    with psycopg.connect(safe_db_url(env["SUPABASE_DB_URL"]), connect_timeout=15) as conn:
        conn.execute((ROOT / "supabase" / "setup.sql").read_text())
        conn.commit()
        dim = conn.execute(
            "select atttypmod from pg_attribute "
            "where attrelid = 'public.documents'::regclass and attname = 'embedding'"
        ).fetchone()[0]
        rows = conn.execute("select count(*) from documents").fetchone()[0]
        has_fn = conn.execute("select count(*) from pg_proc where proname = 'match_documents'").fetchone()[0]
    print(f"Table documents : OK (vector({dim}), {rows} passage(s) stockés)")
    print(f"Fonction match_documents : {'OK' if has_fn else 'ABSENTE'}")

    # 2. Check the REST API with the service_role key, as n8n will use it.
    request = urllib.request.Request(
        env["SUPABASE_URL"].rstrip("/") + "/rest/v1/documents?select=id&limit=1",
        headers={"apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
                 "Authorization": "Bearer " + env["SUPABASE_SERVICE_ROLE_KEY"]},
    )
    try:
        import certifi  # macOS Python builds often ship without root certificates
        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=15, context=context) as response:
        json.loads(response.read())
    print("API Supabase avec la clé service_role : OK")


if __name__ == "__main__":
    main()
