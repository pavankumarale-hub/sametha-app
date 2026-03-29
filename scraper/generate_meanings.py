"""
Generates meanings for all saamethas using Gemini API and uploads to Firestore.
Run once: python generate_meanings.py --api-key YOUR_GEMINI_API_KEY

Resumes automatically if interrupted — skips saamethas that already have meanings.
"""
import json, time, argparse, requests, firebase_admin
from firebase_admin import credentials, firestore

def get_meaning(sametha: str, api_key: str) -> dict | None:
    prompt = f"""You are an expert in Telugu proverbs (saamethas).
For the Telugu proverb: "{sametha}"

Respond with ONLY a valid JSON object (no markdown, no extra text):
{{
  "meaning": "Clear English explanation of what this proverb means and when it is used (2-3 sentences)",
  "example": {{
    "context": "One sentence describing a situation where this proverb applies",
    "conversation": [
      {{ "speaker": "Name1", "line": "dialogue line" }},
      {{ "speaker": "Name2", "line": "dialogue line that naturally uses this proverb" }},
      {{ "speaker": "Name1", "line": "response dialogue line" }}
    ]
  }}
}}"""

    for model in ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"]:
        try:
            res = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600},
                },
                timeout=30,
            )
            if res.status_code == 429:
                retry = int(res.headers.get("Retry-After", 60))
                print(f"  Rate limited, waiting {retry}s...")
                time.sleep(retry + 2)
                # retry same model once
                res = requests.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600},
                    },
                    timeout=30,
                )
            if not res.ok:
                print(f"  {model} failed {res.status_code}: {res.json().get('error', {}).get('message', '')[:100]}")
                continue
            raw = res.json()["candidates"][0]["content"]["parts"][0]["text"]
            raw = raw.replace("```json", "").replace("```", "").strip()
            data = json.loads(raw)
            if data.get("meaning") and data.get("example", {}).get("conversation"):
                return data
        except Exception as e:
            print(f"  {model} error: {e}")
    return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-key", required=True, help="Gemini API key from aistudio.google.com/apikey")
    parser.add_argument("--batch", type=int, default=50, help="Saamethas per run (default 50, free tier ~1500/day)")
    parser.add_argument("--delay", type=float, default=1.5, help="Seconds between requests")
    args = parser.parse_args()

    # Init Firebase
    cred = credentials.Certificate("serviceAccount.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Load saamethas
    with open("saamethas.json", encoding="utf-8") as f:
        saamethas = json.load(f)
    print(f"Total saamethas: {len(saamethas)}")

    # Get already-processed ones
    existing = {doc.id for doc in db.collection("meanings").stream()}
    print(f"Already have meanings: {len(existing)}")

    remaining = [s for s in saamethas if s not in existing]
    print(f"Remaining: {len(remaining)}")

    to_process = remaining[:args.batch]
    print(f"Processing {len(to_process)} this run...\n")

    success = 0
    for i, sametha in enumerate(to_process, 1):
        print(f"[{i}/{len(to_process)}] {sametha[:60]}...")
        data = get_meaning(sametha, args.api_key)
        if data:
            db.collection("meanings").document(sametha).set(data)
            success += 1
            print(f"  -> OK")
        else:
            print(f"  -> SKIPPED (will retry next run)")
        time.sleep(args.delay)

    print(f"\nDone: {success}/{len(to_process)} succeeded.")
    print(f"Remaining after this run: {len(remaining) - success}")
    if remaining[args.batch:]:
        print(f"Run again to continue with the next batch.")

if __name__ == "__main__":
    main()
