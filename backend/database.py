import sqlite3
import json
import os
from datetime import datetime

DB_PATH = "data/lidar.db"

def init_db():
    os.makedirs("data/media", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create maps table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS maps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        snapshot_path TEXT,
        raw_points_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Create artefacts table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS artefacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        map_id INTEGER,
        header TEXT NOT NULL,
        description TEXT,
        media_path TEXT,
        media_type TEXT,
        x_pos REAL,
        y_pos REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (map_id) REFERENCES maps (id) ON DELETE CASCADE
    )
    ''')

    conn.commit()
    conn.close()

def save_map(name, description, snapshot_base64, points):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Save the snapshot as a file
    import base64
    import uuid
    
    snapshot_filename = f"snapshot_{uuid.uuid4().hex}.png"
    snapshot_path = os.path.join("data", "media", snapshot_filename)
    
    # Extract base64 part
    if "," in snapshot_base64:
        snapshot_base64 = snapshot_base64.split(",")[1]
        
    with open(snapshot_path, "wb") as f:
        f.write(base64.b64decode(snapshot_base64))
        
    points_json = json.dumps(points)
    
    cursor.execute(
        "INSERT INTO maps (name, description, snapshot_path, raw_points_json) VALUES (?, ?, ?, ?)",
        (name, description, snapshot_filename, points_json)
    )
    map_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return map_id

def get_all_maps():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, description, snapshot_path, created_at FROM maps ORDER BY created_at DESC")
    maps = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return maps

def get_map_by_id(map_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM maps WHERE id = ?", (map_id,))
    map_row = cursor.fetchone()
    
    if not map_row:
        conn.close()
        return None
        
    map_dict = dict(map_row)
    map_dict["points"] = json.loads(map_dict["raw_points_json"])
    del map_dict["raw_points_json"]
    
    cursor.execute("SELECT * FROM artefacts WHERE map_id = ?", (map_id,))
    artefacts = [dict(row) for row in cursor.fetchall()]
    map_dict["artefacts"] = artefacts
    
    conn.close()
    return map_dict

def update_map(map_id, name, description):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE maps SET name = ?, description = ? WHERE id = ?", (name, description, map_id))
    conn.commit()
    conn.close()
    return True

def save_artefact(map_id, header, description, file_path, file_type, x_pos, y_pos):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO artefacts (map_id, header, description, media_path, media_type, x_pos, y_pos) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (map_id, header, description, file_path, file_type, x_pos, y_pos)
    )
    artefact_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return artefact_id
def delete_map(map_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Deleting a map will cascade delete artefacts due to FK ON DELETE CASCADE
    cursor.execute("DELETE FROM maps WHERE id = ?", (map_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0

def delete_artefact(artefact_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM artefacts WHERE id = ?", (artefact_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0
