"""
Scrapes Telugu proverbs (saamethas) from saamethalu.com
and uploads them to Firebase Firestore.

Usage:
  # Scrape only (saves to saamethas.json):
  python scrape.py

  # Scrape + upload to Firestore:
  python scrape.py --service-account path/to/serviceAccount.json
"""

import argparse
import json
import re
import time

import requests
from bs4 import BeautifulSoup

# Pages on saamethalu.com — letters are grouped on some pages
LETTER_PAGES = [
    'a', 'b', 'c', 'd', 'ef', 'g', 'h', 'i',
    'j', 'k', 'l', 'm', 'n', 'op', 'q', 'r',
    's', 't', 'u', 'v', 'wz',
]

BASE_URL = 'http://saamethalu.com/{}.asp'

SKIP_PATTERNS = [
    'previous page', 'next page', 'home', 'search', 'click here',
    'disclaimer', 'guest book', 'contributors', 'sign', 'view',
    'http', 'www.', '©', 'copyright',
]


def clean(text: str) -> str | None:
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) < 6:
        return None
    lower = text.lower()
    if any(p in lower for p in SKIP_PATTERNS):
        return None
    return text


def fetch_page(letter: str) -> str | None:
    url = BASE_URL.format(letter)
    try:
        resp = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        resp.encoding = 'iso-8859-1'
        return resp.text
    except Exception as exc:
        print(f'  ✗ {url}: {exc}')
        return None


def parse_saamethas(html: str) -> list[str]:
    soup = BeautifulSoup(html, 'html.parser')

    # The saamethas live in the largest table cell (main content area)
    tds = [td for td in soup.find_all('td') if len(td.get_text()) > 100]
    if not tds:
        return []
    main = max(tds, key=lambda td: len(td.get_text()))

    results = []
    raw = main.get_text(separator='\n')
    for line in raw.split('\n'):
        c = clean(line)
        if c:
            results.append(c)
    return results


def scrape_all() -> list[str]:
    all_saamethas: list[str] = []

    for letter in LETTER_PAGES:
        print(f'Scraping [{letter.upper()}]…')
        html = fetch_page(letter)
        if html:
            found = parse_saamethas(html)
            print(f'  Found {len(found)} saamethas')
            all_saamethas.extend(found)
        time.sleep(1)  # Be polite to the server

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique = []
    for s in all_saamethas:
        if s not in seen:
            seen.add(s)
            unique.append(s)

    return unique


def save_json(saamethas: list[str], path: str) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(saamethas, f, ensure_ascii=False, indent=2)
    print(f'\nSaved {len(saamethas)} saamethas -> {path}')


def upload_firestore(saamethas: list[str], service_account: str) -> None:
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as fs
    except ImportError:
        print('firebase-admin not installed. Run:  pip install firebase-admin')
        return

    print(f'\nUploading {len(saamethas)} saamethas to Firestore...')
    cred = credentials.Certificate(service_account)
    firebase_admin.initialize_app(cred)
    db = fs.client()

    BATCH_SIZE = 500
    for i in range(0, len(saamethas), BATCH_SIZE):
        batch = db.batch()
        chunk = saamethas[i:i + BATCH_SIZE]
        for j, text in enumerate(chunk):
            ref = db.collection('saamethas').document(f'{i + j:05d}')
            batch.set(ref, {'text': text, 'index': i + j})
        batch.commit()
        end = min(i + BATCH_SIZE, len(saamethas))
        print(f'  Batch uploaded: {end}/{len(saamethas)}')

    db.collection('meta').document('stats').set({'total': len(saamethas)})
    print(f'\nDone! {len(saamethas)} saamethas are now in Firestore.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape saamethalu.com -> Firestore')
    parser.add_argument(
        '--service-account',
        help='Path to Firebase service account JSON (triggers Firestore upload)',
    )
    parser.add_argument('--output', default='saamethas.json', help='Output JSON file')
    args = parser.parse_args()

    saamethas = scrape_all()
    print(f'\nTotal unique saamethas: {len(saamethas)}')

    save_json(saamethas, args.output)

    if args.service_account:
        upload_firestore(saamethas, args.service_account)
    else:
        print('\nTo upload to Firestore, add:  --service-account path/to/serviceAccount.json')
