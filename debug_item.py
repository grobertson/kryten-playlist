
import sqlite3

conn = sqlite3.connect('d:/Devel/kryten-playlist/catalog.db')
cursor = conn.execute("SELECT thumbnail_url FROM catalog_item WHERE raw_title = 'A Haunted House (2013)'")
print(cursor.fetchone())
