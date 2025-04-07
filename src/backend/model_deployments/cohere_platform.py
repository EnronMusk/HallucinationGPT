import asyncio
import logging
import os
import threading
import time
from typing import Any, AsyncGenerator, Dict, List

import cohere
import requests
from cohere.core.api_error import ApiError
from cohere.types import StreamedChatResponse

from backend.chat.collate import to_dict
from backend.chat.enums import StreamEvent
from backend.model_deployments.base import BaseDeployment
from backend.model_deployments.utils import get_model_config_var
from backend.schemas.cohere_chat import CohereChatRequest
from backend.services.logger import get_logger, send_log_message

import openai as ai
from backend.schemas.chat import ChatMessage, ChatRole
from cohere import NonStreamedChatResponse, FinishReason
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openai.types.chat.chat_completion import Choice
from backend.chat.enums import StreamEvent
import uuid
from backend.chat.enums import StreamEvent

COHERE_API_KEY_ENV_VAR = "COHERE_API_KEY"
OPENAI_API_KEY = "OPENAI_API_KEY"
COHERE_ENV_VARS = [COHERE_API_KEY_ENV_VAR]
DEFAULT_RERANK_MODEL = "rerank-english-v2.0"


logger = get_logger()


class CohereDeployment(BaseDeployment):
    """Cohere Platform Deployment."""

    client_name = "cohere-toolkit"
    api_key = get_model_config_var(COHERE_API_KEY_ENV_VAR)

    def __init__(self, **kwargs: Any):
        # Override the environment variable from the request
        print("init client")
        # oai_key = get_model_config_var(OPENAI_API_KEY)

        self.client = cohere.Client(api_key=self.api_key, client_name=self.client_name)

        try:
            self.oai_client = ai.Client(api_key=oai_key)
        except:
            print("OpenAI API key not found, using Cohere API only.")

    @property
    def rerank_enabled(self) -> bool:
        return True

    @classmethod
    def list_models(cls) -> List[str]:
        if not CohereDeployment.is_available():
            return []

        url = "https://api.cohere.ai/v1/models"
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {cls.api_key}",
        }

        response = requests.get(url, headers=headers)

        if not response.ok:
            logging.warning("Couldn't get models from Cohere API.")
            return []

        models = response.json()["models"]
        return [
            model["name"]
            for model in models
            if model.get("endpoints") and "chat" in model["endpoints"]
        ]

    @classmethod
    def is_available(cls) -> bool:
        return all([os.environ.get(var) is not None for var in COHERE_ENV_VARS])
    
    def openai_event_converter(self, dict):
        """
        Converts an openai text compleition stream chunk to a cohere stream event.
        """

        event_type = 'text-generation' if dict.dict()['finish_reason'] == None else "COMPLETE"
        content = dict.delta.content
        is_finished = False

        if event_type == "COMPLETE":
            is_finished = True

        return {
            "text": content,
            "event_type": event_type,
            "is_finished": is_finished
        }

    async def invoke_chat(self, chat_request: CohereChatRequest, **kwargs: Any) -> Any:
        response = self.client.chat(
            **chat_request.model_dump(exclude={"stream", "file_ids", "agent_id"}),
        )
        yield to_dict(response)

    async def invoke_chat_stream(
        self, chat_request: CohereChatRequest, **kwargs: Any
    ) -> Any:

        chat_request.model = "command-a-03-2025" #MODEL OVERRIDE


        stream = self.client.chat_stream(
            **chat_request.model_dump(exclude={"stream", "file_ids", "agent_id", "user_msg_id", 'bot_msg_id'}),
        )

        for event in stream:
            event_dict = to_dict(event)

            event_dict_log = event_dict.copy()
            event_dict_log.pop("conversation_id", None)

            yield event_dict


    async def invoke_chat_stream_openai(
        self, chat_request: CohereChatRequest, **kwargs: Any
    ) -> Any:
        """
        updated to use openAI api.
        """
        # stream = self.client.chat_stream(
        #     **chat_request.model_dump(exclude={"stream", "file_ids", "agent_id", "user_msg_id", "bot_msg_id"}),
        # )

        prompt = chat_request.message

        #Pull out paramters for renaming.
        n = chat_request.k
        top_p = chat_request.p

        #We need to convert to openAI format, chat history needs reformatting.
        messages = []
        chat_request.chat_history.append(ChatMessage(role=ChatRole.USER, message=prompt)) #If the conversation is empty, start one.

        #Reformat the chat history for openAI API
        for chat_msg in chat_request.chat_history:
            chat_msg = chat_msg.to_openAI_dict()
            messages.append(chat_msg)

        openai_response = self.oai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            n=n,
            top_p=top_p,
            stream=True, #We want streaming here!
            **chat_request.model_dump(include={"tempature", "frequency_p", "max_tokens", "precense_penalty"}),
            # **kwargs,
        )

        total_response = ""
        for event in openai_response:
            oai_event = self.openai_event_converter(event.choices[0])
            content = event.choices[0].delta.content

            send_log_message(
                logger,
                f"Chat event: {to_dict(oai_event)}",
                level="info",
                conversation_id=kwargs.get("conversation_id"),
                user_id=kwargs.get("user_id"),
            )

            if content is not None: 
                total_response += event.choices[0].delta.content
                yield to_dict(oai_event)

        reformated_response = {
            "text": total_response,
            "chat_history": chat_request.chat_history,
            "finish_reason": "COMLPETE",
            "conversation_id": chat_request.conversation_id
        }

        yield {
            "response" : reformated_response, 
            "finish_reason" : "COMPLETE",
            "event_type" : StreamEvent.STREAM_END,
            "is_finished" : True,
            "tokens" : None,
            "billed_units" : None, #add if needed
            "response_id" : str(uuid.uuid4())
        }


    async def invoke_rerank(
        self, query: str, documents: List[Dict[str, Any]], **kwargs: Any
    ) -> Any:
        response = self.client.rerank(
            query=query, documents=documents, model=DEFAULT_RERANK_MODEL
        )

        return to_dict(response)
