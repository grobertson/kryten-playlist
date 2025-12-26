import sqlite3
import os

db_path = './data/catalog.db'
if not os.path.exists(db_path):
    print(f"Database file not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f"Checking database at {db_path}")
print("Tables:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for t in tables:
    print(f" - {t[0]}")

table_names = [t[0] for t in tables]

if 'catalog_item' in table_names:
    print("\nColumns in catalog_item:")
    cursor.execute("PRAGMA table_info(catalog_item);")
    columns = cursor.fetchall()
    for c in columns:
        print(f" - {c[1]} ({c[2]})")

    print("\nFirst 5 items:")
    cursor.execute("SELECT video_id, sanitized_title FROM catalog_item LIMIT 5")
    rows = cursor.fetchall()
    for r in rows:
        print(f" - {r[0]}: {r[1]}")
else:
    print("\ncatalog_item table not found!")

conn.close()
