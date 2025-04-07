#!/usr/bin/env python3
import asyncio
import argparse
import time
import statistics
import random
from datetime import datetime
import uuid
from playwright.async_api import async_playwright

class WebpageStressTest:
    def __init__(self, url, num_users, messages_per_user, delay_between_msgs=1):
        self.url = url
        self.num_users = num_users
        self.messages_per_user = messages_per_user
        self.delay = delay_between_msgs
        self.latencies = []
        self.failures = 0

    async def simulate_user(self, browser, user_id):
        # Launch a new browser context for this user (like a fresh session)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # Navigate to the chat page
            print(f"User {user_id}: Loading webpage")
            start_time = time.time()
            await page.goto(self.url)
            load_time = (time.time() - start_time) * 1000
            print(f"User {user_id}: Page loaded in {load_time:.2f}ms")
            
            # Wait for the chat interface to be ready
            await page.wait_for_selector("input[type='text'], textarea", timeout=10000)
            
            for i in range(self.messages_per_user):
                message = f"Hello from user {user_id}, message {i}"
                
                # Type a message
                input_selector = "input[type='text'], textarea"
                await page.fill(input_selector, message)
                
                # Send the message (click send button or press Enter)
                send_button = await page.query_selector("button[type='submit']")
                
                # Measure latency from sending message to receiving first response
                start_time = time.time()
                
                if send_button:
                    await send_button.click()
                else:
                    # If no send button, try pressing Enter
                    await page.press(input_selector, "Enter")
                
                # Wait for response to appear
                try:
                    # Look for a new message in the chat
                    await page.wait_for_function("""
                        () => {
                            const messages = document.querySelectorAll('.message, .chat-message');
                            return messages.length > 0 && messages[messages.length-1].textContent.includes('');
                        }
                    """, timeout=30000)
                    
                    end_time = time.time()
                    latency = (end_time - start_time) * 1000
                    self.latencies.append(latency)
                    print(f"User {user_id}, Msg {i}: Response received in {latency:.2f}ms")
                    
                except Exception as e:
                    print(f"User {user_id}, Msg {i}: Timeout waiting for response - {str(e)}")
                    self.failures += 1
                
                # Wait before sending next message
                if i < self.messages_per_user - 1:
                    wait_time = random.uniform(self.delay, self.delay * 2)
                    print(f"User {user_id}: Waiting {wait_time:.2f}s before next message")
                    await asyncio.sleep(wait_time)
        
        except Exception as e:
            print(f"User {user_id}: Exception: {str(e)}")
            self.failures += 1
        
        finally:
            # Close this user's browser context
            await context.close()

    async def run_test(self):
        async with async_playwright() as p:
            # Launch a persistent browser instance
            browser = await p.chromium.launch(headless=True)
            
            start_time = time.time()
            print(f"Starting web stress test with {self.num_users} users at {datetime.now()}")
            
            # Create tasks with random start times to simulate real users
            tasks = []
            for i in range(self.num_users):
                # Random delay between 0-10 seconds to simulate different users arriving
                page_load_delay = random.uniform(0, 10)
                
                async def delayed_user(user_id, delay):
                    await asyncio.sleep(delay)
                    await self.simulate_user(browser, user_id)
                
                tasks.append(delayed_user(i, page_load_delay))
            
            await asyncio.gather(*tasks)
            
            await browser.close()
            
            total_time = time.time() - start_time
            return total_time

    def print_results(self, total_time):
        total_interactions = self.num_users * self.messages_per_user
        successful = len(self.latencies)
        failed = self.failures
        success_rate = (successful / total_interactions) * 100 if total_interactions > 0 else 0
        
        print("\n----- Results -----")
        print(f"Total Users: {self.num_users}")
        print(f"Messages Per User: {self.messages_per_user}")
        print(f"Total Interactions: {total_interactions}")
        print(f"Successful Interactions: {successful}")
        print(f"Failed Interactions: {failed}")
        print(f"Success Rate: {success_rate:.2f}%")
        print(f"Total Test Time: {total_time:.2f} seconds")
        
        if self.latencies:
            print(f"Average Response Time: {statistics.mean(self.latencies):.2f} ms")
            print(f"Median Response Time: {statistics.median(self.latencies):.2f} ms")
            print(f"Min Response Time: {min(self.latencies):.2f} ms")
            print(f"Max Response Time: {max(self.latencies):.2f} ms")
            print(f"Interactions Per Second: {successful / total_time:.2f}")

async def main():
    parser = argparse.ArgumentParser(description="Webpage Chat Interface Stress Tester")
    parser.add_argument("--url", type=str, default="http://54.201.168.230:4000", 
                        help="URL of the web chat interface")
    parser.add_argument("--users", type=int, default=5, 
                        help="Number of concurrent users to simulate")
    parser.add_argument("--messages", type=int, default=3, 
                        help="Number of messages per user")
    parser.add_argument("--delay", type=float, default=2.0, 
                        help="Base delay between messages from the same user (seconds)")
    
    args = parser.parse_args()
    
    stress_test = WebpageStressTest(
        url=args.url,
        num_users=args.users,
        messages_per_user=args.messages,
        delay_between_msgs=args.delay
    )
    
    total_time = await stress_test.run_test()
    stress_test.print_results(total_time)

if __name__ == "__main__":
    asyncio.run(main()) 