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
        oai_key = get_model_config_var(OPENAI_API_KEY)

        self.client = cohere.Client(api_key=self.api_key, client_name=self.client_name)
        self.oai_client = ai.Client(api_key=oai_key)

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
    
    def openai_event_converter(dict):
        """
        Converts an openai text compleition stream chunk to a cohere stream event.
        """

        return {
            "event_type": dict['finish_reason']
        }

    async def invoke_chat(self, chat_request: CohereChatRequest, **kwargs: Any) -> Any:
        print("passed chat", chat_request)
        response = self.client.chat(
            **chat_request.model_dump(exclude={"stream", "file_ids", "agent_id"}),
        )
        yield to_dict(response)


    # def func():
    #      """ 
    #     Uses the openAI api. 
    #     \n Takes in a coherechatrequest and reformats it into its equivelant openAI api call. 
    #     \n then rebuilds it back into a cohere-api chat response.
    #     \n two step process where we reformat the NonStreamedChatResponse and the generator fields.
    #     """        
        prompt = chat_request.message

        #Pull out paramters for renaming.
        n = chat_request.k
        top_p = chat_request.p

        #We need to convert to openAI format, chat history needs reformatting.
        messages = []
        #chat_request.chat_history.append(ChatMessage(role=ChatRole.USER, message=prompt)) #If the conversation is empty, start one.

        #Reformat the chat history for openAI API
        for chat_msg in chat_request.chat_history:
            chat_msg = chat_msg.to_openAI_dict()
            messages.append(chat_msg)
        
        print("XSdadasdaisdhi1uy23y12ugeadbahjsdgakjsdhaksjhdaksjhdczmxnb")
        #print(messages)

        try: 
            openai_response = self.OAI_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                n=n,
                top_p=top_p,
                stream=True, #We want streaming here!
                **chat_request.model_dump(include={"tempature", "frequency_p", "max_tokens", "precense_penalty"}),
                **kwargs,
            )
        except self.OAI_client.request():
            print("API limit reached, please try again in one minute.")
            print(openai_response)

    #     #Maps openAI stop reasons to cohere reasons
    #     stop_reason_map = {
    #         "stop": "COMPLETE", 
    #         "length": "MAX_TOKENS", 
    #         "content_filter" : "ERROR_TOXIC"
    #     }

    #     #Yield the first formatted dictioanry (stream start)
    #     yield {
    #         'generation_id' : str(uuid.uuid4()),
    #         'event_type' : StreamEvent.STREAM_START,
    #         'is_finished' : False#,
    #         # 'conversation_id' : chat_request.conversation_id 

    #     }
        
    #     #here we create all the intermediate generated tokens for the generator.

    #     total_response = ""

    #     for event in openai_response:
    #         choice = event.__dict__['choices'][0] #Grab the first choice.

    #         #Check if the generation process is finished.
    #         if choice.finish_reason == None: 
    #             total_response += choice.delta.content #Add intermediate token to total response

    #             #Yield intermediate token if not finished
    #             yield {
    #                 'text' : choice.delta.content,
    #                 'event_type' : StreamEvent.TEXT_GENERATION,
    #                 'is_finished' : False
    #             }
    #         else: reformatted_stop_reason = stop_reason_map[choice.finish_reason] #It is stopped, so grab the reason.

    #     #Add the latest chatbot response in cohere format.
    #     #chat_request.chat_history.append(ChatMessage(role=ChatRole.CHATBOT, message=total_response))

    #     #We need to rebuild a NonStreamedChatResponse so it works with the rest of the software. This is for the total and final output.
    #     reformated_response = NonStreamedChatResponse(
    #         text=total_response,
    #         chat_history=chat_request.chat_history,
    #         finish_reason=reformatted_stop_reason,
    #         conversation_id=chat_request.conversation_id
    #     )

    #     #Yield final formatted dictionary with total response. (stream end)
    #     yield {
    #         "response" : reformated_response, 
    #         "finish_reason" : reformatted_stop_reason,
    #         "event_type" : StreamEvent.STREAM_END,
    #         "is_finished" : True,
    #         "tokens" : None,
    #         "billed_units" : None, #add if needed
    #         "response_id" : str(uuid.uuid4())
    #     }

    async def invoke_chat_stream(
        self, chat_request: CohereChatRequest, **kwargs: Any
    ) -> Any:
        print("passe!!!!!!!!!!!!!!!!!d", chat_request)
        stream = self.client.chat_stream(
            **chat_request.model_dump(exclude={"stream", "file_ids", "agent_id", "user_msg_id", "bot_msg_id"}),
        )

        print(stream)

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
        
        print("XSdadasdaisdhi1uy23y12ugeadbahjsdgakjsdhaksjhdaksjhdczmxnb")
        print(messages)
        print("chat_req_msg")
        print(chat_request.message)

        openai_response = self.oai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            n=n,
            top_p=top_p,
            stream=True, #We want streaming here!
            **chat_request.model_dump(include={"tempature", "frequency_p", "max_tokens", "precense_penalty"}),
            # **kwargs,
        )

        print("openai response")
        for event in openai_response:
            print(event.choices[0])
            # yield{"message":"stinky"}
            # send_log_message(
            #     logger,
            #     f"Chat event: {to_dict(event)}",
            #     level="info",
            #     conversation_id=kwargs.get("conversation_id"),
            #     user_id=kwargs.get("user_id"),
            # )
            # yield to_dict(event)

        for event in stream:
            # send_log_message(
            #     logger,
            #     f"Chat event: {to_dict(event)}",
            #     level="info",
            #     conversation_id=kwargs.get("conversation_id"),
            #     user_id=kwargs.get("user_id"),
            # )
            print(to_dict(event))
            yield to_dict(event)

    async def invoke_rerank(
        self, query: str, documents: List[Dict[str, Any]], **kwargs: Any
    ) -> Any:
        response = self.client.rerank(
            query=query, documents=documents, model=DEFAULT_RERANK_MODEL
        )

        return to_dict(response)
