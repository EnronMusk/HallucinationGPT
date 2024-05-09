import logging
import os
from typing import Any, Dict, Generator, List

import cohere
import requests
import openai as ai
import openai as ai
from cohere.types import StreamedChatResponse

from backend.chat.custom.model_deployments.base import BaseDeployment
from backend.schemas.cohere_chat import CohereChatRequest

#Imports for our openAI api call
from backend.schemas.chat import ChatMessage, ChatRole
from cohere import NonStreamedChatResponse, FinishReason
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openai.types.chat.chat_completion import Choice

#Imports for our openAI api call
from backend.schemas.chat import ChatMessage, ChatRole
from cohere import NonStreamedChatResponse, FinishReason
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openai.types.chat.chat_completion import Choice


class CohereDeployment(BaseDeployment):
    """Cohere Platform Deployment."""

    api_key = os.environ.get("COHERE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    client_name = "cohere-toolkit"

    def __init__(self):
        self.client = cohere.Client(api_key=self.api_key, client_name=self.client_name)
        self.OAI_client = ai.Client(api_key=self.openai_key)
        self.OAI_client = ai.Client(api_key=self.openai_key)
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
        return [model["name"] for model in models if "chat" in model["endpoints"]]

    @classmethod
    def is_available(cls) -> bool:
        return cls.api_key is not None

    #Original Method utilizing cohere API

    def invoke_chat_old(self, chat_request: CohereChatRequest, **kwargs: Any) -> Any:
    #Original Method utilizing cohere API

    def invoke_chat_old(self, chat_request: CohereChatRequest, **kwargs: Any) -> Any:
        return self.client.chat(
            **chat_request.model_dump(exclude={"stream"}),
            **kwargs,
        )

    #Modify this to openAI chat request

    def invoke_chat(self, chat_request: CohereChatRequest, **kwargs: Any) -> Any:

        """ 
        Uses the openAI api. 
        \n Takes in a coherechatrequest and reformats it into its equivelant openAI api call. 
        \n then rebuilds it back into a cohere-api chat response.
        """

        prompt = chat_request.message

        #Pull out paramters for renaming.
        n = chat_request.k
        top_p = chat_request.p

        #We need to convert to openAI format, chat history needs reformatting.

        messages = []
        chat_request.chat_history.append(ChatMessage(role=ChatRole.USER, message=prompt)) #Add the latest prompt in cohere format.

        #Reformat
        for chat_msg in chat_request.chat_history:
            chat_msg = chat_msg.to_openAI_dict()
            messages.append(chat_msg)

        #OpenAI return classes
        # J = ChatCompletion()
        # H = ChatCompletionMessage()
        # K = Choice()
        # U = FinishReason

        try: 
            openai_response = self.OAI_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                n=n,
                top_p=top_p,
                **chat_request.model_dump(include={"tempature", "frequency_p", "max_tokens", "precense_penalty"}),
                **kwargs,
            )
        except ai.error.RateLimitError: 
            print("API limit reached, please try again in one minute.")
            return NonStreamedChatResponse(text="", chat_history=chat_request.chat_history, finish_reason="ERROR_LIMIT")

        # Maps openAI stop reasons to cohere reasons
        stop_reason_map = {
            "stop": "COMPLETION", 
            "length": "MAX_TOKENS", 
            "content_filter" : "ERROR_TOXIC"
        }

        #We need to rebuild a NonStreamedChatResponse so it works with the rest of the software.
        reformated_response = NonStreamedChatResponse(
            text=openai_response.choices[0].message.content,
            chat_history=chat_request.chat_history,
            finish_reason=stop_reason_map[openai_response.choices[0].finish_reason]
        )

        return reformated_response

    def invoke_chat_stream(
        self, chat_request: CohereChatRequest, **kwargs: Any
    ) -> Generator[StreamedChatResponse, None, None]:
        stream = self.client.chat_stream(
            **chat_request.model_dump(exclude={"stream"}),
            **kwargs,
        )
        for event in stream:
            yield event.__dict__

    def invoke_search_queries(
        self,
        message: str,
        chat_history: List[Dict[str, str]] | None = None,
        **kwargs: Any,
    ) -> list[str]:
        res = self.client.chat(
            message=message,
            chat_history=chat_history,
            search_queries_only=True,
            **kwargs,
        )

        if not res.search_queries:
            return []

        return [s.text for s in res.search_queries]

    def invoke_rerank(
        self, query: str, documents: List[Dict[str, Any]], **kwargs: Any
    ) -> Any:
        return self.client.rerank(
            query=query, documents=documents, model="rerank-english-v2.0", **kwargs
        )

    def invoke_tools(self, message: str, tools: List[Any], **kwargs: Any) -> List[Any]:
        return self.client.chat(
            message=message, tools=tools, model="command-r", **kwargs
        )
