from backend.crud.conversation import extract_conversations, Conversation
from backend.database_models.user import User

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

import json
from datetime import datetime
from tqdm import tqdm

def datetime_handler(obj):
    """Handle datetime serialization for JSON dump"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

load_dotenv()

SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, echo=False
)

db = Session(autocommit=False, autoflush=False, bind=engine)

def run_script():
    """
    Saves all conversations and users in the database in format:
    conversations.txt: `conv_id` : {conversation attributes}
    users.txt: `user_id` : {user attributes}
    """
    
    # Extract and save conversations
    conversations = extract_conversations(db)
    conv_data = {}
    for conv in tqdm(conversations, desc="Processing conversations"):
        id, p_conv = parse_conversation(conv)
        conv_data[id] = p_conv
    
    # Extract and save users
    users = db.query(User).all()
    user_data = {}
    for user in tqdm(users, desc="Processing users"):
        id, p_user = parse_user(user)
        user_data[id] = p_user

    # Save conversations with datetime handler
    conv_file_path = "conversations.txt"
    with open(conv_file_path, "w") as file:
        json.dump(conv_data, file, default=datetime_handler)

    # Save users with datetime handler
    user_file_path = "users.txt"
    with open(user_file_path, "w") as file:
        json.dump(user_data, file, default=datetime_handler)

    print(f"Successfully saved {len(conversations)} conversations to {conv_file_path}!")
    print(f"Successfully saved {len(users)} users to {user_file_path}!")
    
    # Verify data can be loaded
    try:
        with open(conv_file_path, "r") as file:
            loaded_conv_data = json.load(file)
        with open(user_file_path, "r") as file:
            loaded_user_data = json.load(file)
        print("Successfully verified data integrity!")
    except Exception as e:
        print("Error loading saved data - possible corruption.")
        print(f"Error message: {e}")

def parse_user(user: User) -> tuple[str, dict]:
    """Returns a user_id and dictionary of all user data."""
    return user.id, {
        'fullname': user.fullname,
        'email': user.email,
        'ip_address': user.ip_address,
        'headers': user.headers,
        'date': user.date
    }

def parse_conversation(conv: Conversation) -> tuple[str, dict]:
    """Returns a conversation_id and dictionary of all conversation data."""
    parsed_messages = [{
        'role': msg.agent, 
        'text': msg.text, 
        'm_id': msg.id,
        'date': msg.date,
        'feedback': msg.feedback,
        'annotations': [{
            'a_id': annot.id,
            'htext': annot.htext,
            'annotation': annot.annotation,
            'start': annot.start,
            'end': annot.end
        } for annot in msg.annotations],
        'position': msg.position,
        'citations': [{
            'c_id': citation.id,
            'text': citation.text,
            'start': citation.start,
            'end': citation.end
        } for citation in msg.citations],
        'is_annotation_response': msg.is_annotation_response
    } for msg in conv.messages]

    return conv.id, {
        'user_id': conv.user_id,
        'messages': parsed_messages,
        'is_active': conv.is_active
    }

if __name__ == "__main__":
    run_script()