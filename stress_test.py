#!/usr/bin/env python3
import argparse
import asyncio
import aiohttp
import time
import statistics
import json
from datetime import datetime
import uuid
import random

class ChatbotStressTest:
    def __init__(self, url, num_users, messages_per_user, delay_between_msgs=1):
        self.url = url
        self.num_users = num_users
        self.messages_per_user = messages_per_user
        self.delay = delay_between_msgs
        self.latencies = []
        self.user_creation_latencies = []  # New list for user creation latencies
        self.failures = 0
        self.user_creation_failures = 0  # New counter for user creation failures

    async def simulate_user(self, user_id):
        # First create a user
        user_fullname = f"Stress Test User {user_id}"
        user_email = f"stress_test_{user_id}@example.com"
        user_id_str = f"stress-test-user-{user_id}-{int(time.time())}"
        
        async with aiohttp.ClientSession() as session:
            # Create user first
            user_payload = {
                "fullname": user_fullname,
                "email": user_email
            }
            
            user_headers = {
                "User-Id": user_id_str,
                "Content-Type": "application/json"
            }
            
            user_url = self.url.replace("/chat-stream", "").replace("/chat", "") + "/users/add"
            
            try:
                print(f"Creating user {user_id_str}...")
                # Measure user creation latency
                user_start_time = time.time()
                async with session.put(user_url, json=user_payload, headers=user_headers) as response:
                    user_response_text = await response.text()
                    user_end_time = time.time()
                    user_latency = (user_end_time - user_start_time) * 1000  # ms
                    
                    if response.status == 200:
                        self.user_creation_latencies.append(user_latency)
                        print(f"User {user_id_str} created successfully in {user_latency:.2f}ms")
                    else:
                        print(f"Failed to create user {user_id_str}: {response.status} - {user_response_text}")
                        self.user_creation_failures += 1
            except Exception as e:
                print(f"Exception creating user {user_id_str}: {str(e)}")
                self.user_creation_failures += 1
            
            # Now continue with chat simulation
            conversation_id = str(uuid.uuid4())
            
            # Predefined chat history with several turns
            chat_history = [
                {"message": "What can you help me with?", "tool_calls": None, "role": "USER"},
                {"message": "I can assist with answering questions, providing information, helping with tasks, and having conversations on various topics. Feel free to ask me anything!", "tool_calls": None, "role": "CHATBOT"},
                {"message": "Tell me about machine learning.", "tool_calls": None, "role": "USER"},
                {"message": "Machine learning is a subfield of artificial intelligence that focuses on developing systems that can learn from and make decisions based on data. Instead of explicitly programming rules, these systems improve their performance over time through experience. There are several approaches including supervised learning, unsupervised learning, and reinforcement learning.", "tool_calls": None, "role": "CHATBOT"},
                {"message": "What's the difference between AI and ML?", "tool_calls": None, "role": "USER"},
                {"message": "Artificial Intelligence (AI) is the broader concept of machines being able to carry out tasks in a way that we would consider 'smart'. Machine Learning (ML) is a specific subset of AI that focuses on the ability of machines to receive data and learn from it without being explicitly programmed. In other words, ML is one approach to achieve AI. While AI encompasses a wide range of techniques including rule-based systems and symbolic reasoning, ML specifically uses statistical methods to enable machines to improve with experience.", "tool_calls": None, "role": "CHATBOT"}
            ]
            
            for i in range(self.messages_per_user):
                try:
                    # Random delay to simulate thinking time
                    thinking_delay = random.uniform(1, 5)
                    await asyncio.sleep(thinking_delay)
                    
                    # CohereChatRequest format
                    payload = {
                        "message": f"Hello from user {user_id}, message {i}",
                        "model": "command-a-03-2025",
                        "chat_history": chat_history,
                        "conversation_id": conversation_id,
                        "stream": True
                    }
                    
                    # Add required headers
                    headers = {
                        "User-Id": user_id_str,
                        "Content-Type": "application/json",
                        "Accept": "text/event-stream"
                    }
                    
                    start_time = time.time()
                    async with session.post(self.url, json=payload, headers=headers) as response:
                        if response.status == 200:
                            # For SSE streams, we need to read and process each chunk
                            # Just measure the time until we get the first chunk
                            await response.content.read(1)
                            end_time = time.time()
                            latency = (end_time - start_time) * 1000  # ms
                            self.latencies.append(latency)
                            print(f"User {user_id}, Msg {i}: {latency:.2f}ms")
                            
                            # Drain the remaining response to avoid connection issues
                            async for _ in response.content:
                                pass
                        else:
                            error_text = await response.text()
                            print(f"User {user_id}, Msg {i}: Error {response.status} - {error_text}")
                            self.failures += 1
                            
                except Exception as e:
                    print(f"User {user_id}, Msg {i}: Exception {str(e)}")
                    self.failures += 1
                
                # Wait before sending next message
                if i < self.messages_per_user - 1:
                    await asyncio.sleep(self.delay)

    async def run_test(self):
        start_time = time.time()
        print(f"Starting stress test with {self.num_users} users at {datetime.now()}")
        
        tasks = [self.simulate_user(i) for i in range(self.num_users)]
        await asyncio.gather(*tasks)
        
        total_time = time.time() - start_time
        return total_time

    def print_results(self, total_time):
        total_requests = len(self.latencies) + self.failures
        success_rate = (len(self.latencies) / total_requests) * 100 if total_requests > 0 else 0
        
        user_creation_attempts = len(self.user_creation_latencies) + self.user_creation_failures
        user_creation_success_rate = (len(self.user_creation_latencies) / user_creation_attempts) * 100 if user_creation_attempts > 0 else 0
        
        print("\n----- Results -----")
        print(f"Total Users: {self.num_users}")
        print(f"Messages Per User: {self.messages_per_user}")
        
        print("\n----- User Creation Stats -----")
        print(f"User Creation Attempts: {user_creation_attempts}")
        print(f"Successful User Creations: {len(self.user_creation_latencies)}")
        print(f"Failed User Creations: {self.user_creation_failures}")
        print(f"User Creation Success Rate: {user_creation_success_rate:.2f}%")
        
        if self.user_creation_latencies:
            print(f"Average User Creation Latency: {statistics.mean(self.user_creation_latencies):.2f} ms")
            print(f"Median User Creation Latency: {statistics.median(self.user_creation_latencies):.2f} ms")
            print(f"Min User Creation Latency: {min(self.user_creation_latencies):.2f} ms")
            print(f"Max User Creation Latency: {max(self.user_creation_latencies):.2f} ms")
        
        print("\n----- Chat Stats -----")
        print(f"Total Chat Requests: {total_requests}")
        print(f"Successful Chat Requests: {len(self.latencies)}")
        print(f"Failed Chat Requests: {self.failures}")
        print(f"Chat Success Rate: {success_rate:.2f}%")
        print(f"Total Time: {total_time:.2f} seconds")
        
        if self.latencies:
            print(f"Average Chat Latency: {statistics.mean(self.latencies):.2f} ms")
            print(f"Median Chat Latency: {statistics.median(self.latencies):.2f} ms")
            print(f"Min Chat Latency: {min(self.latencies):.2f} ms")
            print(f"Max Chat Latency: {max(self.latencies):.2f} ms")
            print(f"Requests Per Second: {len(self.latencies) / total_time:.2f}")

async def main():
    parser = argparse.ArgumentParser(description="Chatbot Server Stress Tester")
    parser.add_argument("--url", type=str, default="http://localhost:8000/v1/chat-stream", 
                        help="URL endpoint of the chatbot API")
    parser.add_argument("--users", type=int, default=10, 
                        help="Number of concurrent users to simulate")
    parser.add_argument("--messages", type=int, default=5, 
                        help="Number of messages per user")
    parser.add_argument("--delay", type=float, default=1.0, 
                        help="Delay between messages from the same user (seconds)")
    
    args = parser.parse_args()
    
    stress_test = ChatbotStressTest(
        url=args.url,
        num_users=args.users,
        messages_per_user=args.messages,
        delay_between_msgs=args.delay
    )
    
    total_time = await stress_test.run_test()
    stress_test.print_results(total_time)

if __name__ == "__main__":
    asyncio.run(main()) 