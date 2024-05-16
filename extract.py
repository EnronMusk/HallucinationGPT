from src.backend.crud.conversation import extract_conversations, Conversation

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

import json
from datetime import datetime

load_dotenv()

SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, echo=False
)

db = Session(autocommit=False, autoflush=False, bind=engine)

def run_script():

    """
    
    Saves all conversations in the database in format:
    \n`conv_id` : {conversation attributes}

    """
    
    conversations = extract_conversations(db)

    file_path = "conversations.txt"

    data = {}

    #Format the data and assemble the new conversation dictionary
    for conv in conversations:

        id, p_conv = parse_conversation(conv)
        data[id] = p_conv

    #Save it
    with open(file_path, "w") as file:
        json.dump(data, file)

    print(f"Succesfully saved file at {file_path}! Saved {len(conversations)} conversations!")

    #Check to see if we can load data without errors.
    try:
        with open(file_path, "r") as file:
            loaded_data = json.load(file)
    except Exception as e:
        print("We were unable to load the data, this means it isnt being saved properly and is corrupted.")
        print(f"Error message: {e}")

#Turns a conversation into something we can store.
def parse_conversation(conv : Conversation) -> tuple[str, dict]:
    """
    
    Returns a conversation_id and dictionary of all conversation data.
    
    """

    parsed_messages = [{'role' : msg.agent, 'text' : msg.text} for msg in conv.messages]

    return conv.id, {
        'date' : conv.created_at.strftime("%Y-%m-%d"),
        'user_id' : conv.user_id,
        'messages' : parsed_messages
    }

if __name__ == "__main__":
    run_script()