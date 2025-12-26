
import sqlite3
import os

db_path = 'd:/Devel/kryten-playlist/catalog.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.execute("SELECT video_id, raw_title, year, genre, mood, synopsis, thumbnail_url FROM catalog_item WHERE raw_title LIKE '%Haunted House%' LIMIT 5")
rows = cursor.fetchall()

print(f"Found {len(rows)} items:")
for row in rows:
    print("-" * 40)
    print(f"Title: {row['raw_title']}")
    print(f"Year: {row['year']}")
    print(f"Genre: {row['genre']}")
    print(f"Mood: {row['mood']}")
    print(f"Synopsis: {row['synopsis'][:50] if row['synopsis'] else 'None'}")
    print(f"Thumbnail: {row['thumbnail_url']}")
