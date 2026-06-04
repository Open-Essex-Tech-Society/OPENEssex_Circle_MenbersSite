import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'face_auth.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            face_encoding TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def save_user(username, name, face_encoding_list):
    """
    Saves a user and their face encoding (list of floats) to the database.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    encoding_json = json.dumps(face_encoding_list)
    try:
        cursor.execute(
            "INSERT INTO users (username, name, face_encoding) VALUES (?, ?, ?)",
            (username, name, encoding_json)
        )
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False # Username already exists
    finally:
        conn.close()
    return success

def get_all_users():
    """
    Returns a list of dictionaries containing all users and their parsed encodings.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    conn.close()

    users = []
    for row in rows:
        users.append({
            "id": row["id"],
            "username": row["username"],
            "name": row["name"],
            "face_encoding": json.loads(row["face_encoding"])
        })
    return users

# Initialize database on module import
init_db()
