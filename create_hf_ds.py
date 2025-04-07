import json
import hashlib
from datetime import datetime
from datasets import Dataset
from collections import Counter
import tqdm
from typing import Dict, List, Any
import argparse
from ip2geotools.databases.noncommercial import DbIpCity

def most_common(l: List[str]) -> str:
    """Return the most common element in a list."""
    c = Counter(l)
    value, count = c.most_common()[0]
    return value

def get_location_from_ip(ip: str) -> tuple[str, str]:
    """Get country and state from IP address using free IP database."""
    try:
        response = DbIpCity.get(ip, api_key=None)
        country = response.country or ''
        state = response.region or ''
        return country, state
    except Exception as e:
        print(f"Warning: Could not get location for IP {ip}: {e}")
        return '', ''

def process_conversation(conv_id: str, conv_data: Dict, users_data: Dict) -> Dict[str, Any]:
    """Process a single conversation and return structured data."""
    # Debug prints
    print(f"\nProcessing conversation {conv_id}")
    print(f"Conv data keys: {conv_data.keys()}")
    print(f"User ID from conv: {conv_data.get('user_id', 'NOT FOUND')}")
    
    messages = conv_data['messages']
    
    # Get user data
    user_id = conv_data['user_id']
    user_data = users_data.get(user_id, {})
    print(f"User data: {user_data}")  # Debug print
    
    # Extract user's IP and headers
    headers = user_data.get('headers',None)  # Changed to handle None case
    if headers:
        real_ip = headers.pop('x-forwarded-for', '') if headers else ''
    else:
        real_ip = ""
    
    # Get location data from IP
    # country, state = get_location_from_ip(real_ip) if real_ip else ('', '')
    country, state = '', ''  # Temporarily disable IP lookup for debugging
    
    # Hash the real IP for privacy
    hashed_ip = hashlib.sha256(real_ip.encode('utf-8')).hexdigest()[:32] if real_ip else ''
    header_str = json.dumps(headers) if headers else ''
    
    # Extract conversation data
    conversation = []
    timestamps = []
    total_annotations = 0
    
    for msg in messages:
        try:
            timestamp = datetime.fromisoformat(msg['date'])
            timestamps.append(timestamp)
        except (TypeError, ValueError) as e:
            print(f"Warning: Could not parse timestamp {msg.get('date')} - {e}")
            continue
            
        # Count annotations
        annotations = msg.get('annotations', [])
        annotation_count = len(annotations)
        total_annotations += annotation_count
            
        turn = {
            'role': msg['role'],
            'content': msg['text'],
            'timestamp': msg['date'],
            'header': header_str,
            'feedback': msg.get('feedback', ""),
            'turn_identifier': msg['m_id'],
            'language': 'English',
            'country': country,
            'state': state,
            'hashed_ip': hashed_ip,
            'redacted': msg.get('is_annotation_response', False),
            'annotation_count': annotation_count,
            'annotations': [{
                'id': ann.get('a_id'),
                'text': ann.get('htext', ''),
                'annotation': ann.get('annotation', ''),
                'start': ann.get('start'),
                'end': ann.get('end')
            } for ann in msg.get('annotations', [])]
        }
        conversation.append(turn)
    
    if not conversation:
        return None
        
    # Generate conversation hash
    conv_hash = [{'content': turn['content'], 'role': turn['role']} for turn in conversation]
    conv_key = hashlib.sha256(json.dumps(conv_hash).encode('utf-8')).hexdigest()[:32]
    
    return {
        'conversation_hash': conv_key,
        'model': 'command-r',
        'timestamp': max(timestamps) if timestamps else None,
        'conversation': conversation,
        'turn': len(messages) // 2,
        'language': 'English',
        'redacted': any(turn['redacted'] for turn in conversation),
        'state': state,
        'country': country,
        'hashed_ip': hashed_ip,
        'header': header_str,
        'user_id': user_id,
        'annotation_count': total_annotations
    }

def process_dataset(conversations: Dict, users_data: Dict, cutoff_date: datetime) -> Dataset:
    """Process the conversations and create a Hugging Face Dataset."""
    processed_data = {
        'conversation_hash': [],
        'model': [],
        'timestamp': [],
        'conversation': [],
        'turn': [],
        'language': [],
        'redacted': [],
        'state': [],
        'country': [],
        'hashed_ip': [],
        'header': [],
        'user_id': [],
        'annotation_count': []
    }
    
    # Process each conversation
    for conv_id, conv_data in tqdm.tqdm(conversations.items()):
        try:
            processed_conv = process_conversation(conv_id, conv_data, users_data)
            if processed_conv is None:
                continue
                
            # Skip conversations after cutoff date
            if processed_conv['timestamp'] > cutoff_date:
                continue
                
            # Add to processed data
            for key in processed_data:
                processed_data[key].append(processed_conv[key])
                
        except Exception as e:
            print(f"Error processing conversation {conv_id}: {e}")
            continue
    
    return Dataset.from_dict(processed_data)

def main():
    parser = argparse.ArgumentParser(description='Create a Hugging Face dataset from conversation data')
    parser.add_argument('--input_file', default='conversations.txt',
                      help='Path to the conversations.txt file')
    parser.add_argument('--users_file', default='users.txt',
                      help='Path to the users.txt file')
    parser.add_argument('--cutoff-date', default='2025-04-30', 
                      help='Cutoff date in YYYY-MM-DD format')
    parser.add_argument('--hub-path', default='yuntian-group/ChatAnnotators',
                      help='Hugging Face Hub path to upload the dataset')
    args = parser.parse_args()

    # Load conversations and users
    print(f"Loading conversations from {args.input_file}")
    with open(args.input_file, 'r') as f:
        conversations = json.load(f)
    
    print(f"Loading users from {args.users_file}")
    with open(args.users_file, 'r') as f:
        users_data = json.load(f)
    
    # Parse cutoff date
    cutoff_date = datetime.strptime(args.cutoff_date, '%Y-%m-%d')
    
    # Process dataset
    print("Processing conversations...")
    dataset = process_dataset(conversations, users_data, cutoff_date)
    
    # Print statistics
    print(f"Processed dataset contains {len(dataset)} conversations")
    
    # Push to hub
    print(f"Pushing dataset to {args.hub_path}")
    dataset.push_to_hub(args.hub_path, split='train')
    
    print("Done!")

if __name__ == "__main__":
    main()