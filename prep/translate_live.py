"""
translate_live.py — fill missing Chinese fields on live English-only rows via DeepL (EN→ZH).

Some feeds are English-only US-government sources (e.g. Federal Register import slugs) with no
Chinese original, so their rows carry a null chineseTitle/chineseSummary and the 中文 UI falls back
to the English text. This step machine-translates those missing zh fields at build time so the
list reads consistently in 中文 mode. Curated bilingual seeds (which already have Chinese) are left
untouched — we only ever FILL a missing zh field, never overwrite an existing one.

Design / guarantees:
  * DeepL API Free (https://api-free.deepl.com/v2/translate), no extra pip deps (urllib only).
  * Checked-in cache `data/v2/mt_cache.json` keyed by sha1(source_text) → {"zh","at"} so unchanged
    text is never re-translated (controls cost + keeps diffs stable; the stored `at` is reused so
    a row's provenance.mtAt doesn't churn every daily run).
  * Marks each machine-translated row with provenance.mtAt (ISO) — the UI shows a "机器翻译 /
    machine-translated" badge off this, distinct from the "英文原文" fallback badge.
  * FAILURE-SAFE: no DEEPL_KEY → whole step no-ops and leaves data untouched (so the site keeps
    falling back to English, never a broken build — the frozen-refresh lesson). A per-batch API
    error logs a warning and leaves those rows English. Always exits 0.

Run order (CI): collect → enrich → domains → translate → meta → validate → export.
Run: npm run prep:translate
Env: DEEPL_KEY (required to do anything). DEEPL_MOCK=1 = offline self-test (no network, fake zh).
"""
import json, os, sys, hashlib, urllib.request, urllib.parse
from datetime import datetime, timezone

DATA = os.path.abspath(os.environ.get("PREP_OUTPUT_DIR", os.path.join(os.path.dirname(__file__), "..", "data", "v2")))
CACHE_PATH = os.path.join(DATA, "mt_cache.json")
DEEPL_KEY = os.environ.get("DEEPL_KEY", "").strip()
MOCK = os.environ.get("DEEPL_MOCK", "") == "1"
DEEPL_URL = os.environ.get("DEEPL_API_URL", "https://api-free.deepl.com/v2/translate")
BATCH = 40  # DeepL allows up to 50 texts/request; stay under.

# Which module files + (english_field, chinese_field) pairs to backfill. English-only live feeds
# live in these files; curated-seed rows already have zh and are skipped by the "only-fill" rule.
_TITLE_SUMMARY = [("englishTitle", "chineseTitle"), ("englishSummary", "chineseSummary")]
TARGETS = [
    {"file": "import_export.json", "pairs": _TITLE_SUMMARY},  # Federal Register import slugs (English-only)
    {"file": "regulatory.json", "pairs": _TITLE_SUMMARY},     # FDA recalls / Federal Register / CDC NORS (English-only)
    {"file": "sentiment.json", "pairs": _TITLE_SUMMARY},      # Food Safety News RSS (English-only)
]


def log(msg):
    print(f"[translate] {msg}", flush=True)


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def key_of(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def deepl_translate(texts):
    """EN→ZH for a list of texts; returns list aligned to input. Raises on API failure."""
    if MOCK:
        return ["【译】" + t for t in texts]
    data = [("target_lang", "ZH"), ("source_lang", "EN")] + [("text", t) for t in texts]
    req = urllib.request.Request(
        DEEPL_URL,
        data=urllib.parse.urlencode(data).encode("utf-8"),
        headers={"Authorization": f"DeepL-Auth-Key {DEEPL_KEY}", "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.load(r)
    return [t["text"] for t in out["translations"]]


def main():
    if not DEEPL_KEY and not MOCK:
        log("DEEPL_KEY not set — skipping (rows stay English, UI falls back). This is not an error.")
        return 0

    cache = {}
    if os.path.exists(CACHE_PATH):
        try:
            cache = json.load(open(CACHE_PATH, encoding="utf-8"))
        except Exception as e:
            log(f"cache unreadable ({e}); starting fresh")
            cache = {}

    # 1) Collect every (source_text) that needs a zh but isn't cached, across all target files.
    needed = {}  # key -> source_text
    plan = []    # (file, record, en_field, zh_field, source_text, key)
    files = {}
    for tgt in TARGETS:
        path = os.path.join(DATA, tgt["file"])
        if not os.path.exists(path):
            continue
        rows = json.load(open(path, encoding="utf-8"))
        files[tgt["file"]] = (path, rows)
        for rec in rows:
            for en_f, zh_f in tgt["pairs"]:
                src = (rec.get(en_f) or "").strip()
                if not src or (rec.get(zh_f) or "").strip():
                    continue  # nothing to translate, or zh already present (seed) — never overwrite
                k = key_of(src)
                plan.append((tgt["file"], rec, en_f, zh_f, src, k))
                if k not in cache:
                    needed[k] = src

    if not plan:
        log("nothing to translate (all live rows already have Chinese)")
        _write_cache(cache)
        return 0

    # 2) Fill cache misses via DeepL, in batches; failure-safe per batch.
    miss_keys = list(needed.keys())
    log(f"{len(plan)} field(s) need zh; {len(miss_keys)} new to translate, {len(plan) - len(miss_keys)} from cache")
    for i in range(0, len(miss_keys), BATCH):
        chunk = miss_keys[i : i + BATCH]
        try:
            zh = deepl_translate([needed[k] for k in chunk])
            at = now_iso()
            for k, z in zip(chunk, zh):
                cache[k] = {"zh": z, "at": at}
        except Exception as e:
            log(f"WARNING: DeepL batch {i // BATCH} failed ({str(e)[:120]}) — those rows stay English")

    # 3) Apply cached translations back into records + stamp provenance.mtAt.
    applied = 0
    touched_files = set()
    for fname, rec, en_f, zh_f, src, k in plan:
        hit = cache.get(k)
        if not hit:
            continue  # translation failed this run; leave English fallback
        rec[zh_f] = hit["zh"]
        prov = rec.setdefault("provenance", {})
        # Keep the earliest mt stamp already on the row; else use the cache entry's time.
        if not prov.get("mtAt"):
            prov["mtAt"] = hit["at"]
        applied += 1
        touched_files.add(fname)

    for fname in touched_files:
        path, rows = files[fname]
        json.dump(rows, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        open(path, "a").write("\n")
        log(f"wrote {fname}")

    _write_cache(cache)
    log(f"done — applied {applied} zh field(s) across {len(touched_files)} file(s)")
    return 0


def _write_cache(cache):
    json.dump(cache, open(CACHE_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2, sort_keys=True)
    open(CACHE_PATH, "a").write("\n")


if __name__ == "__main__":
    sys.exit(main())
