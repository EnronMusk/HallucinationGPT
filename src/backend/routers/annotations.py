import json
import os
from distutils.util import strtobool
from typing import Any, Generator, List, Union
from uuid import uuid4

from cohere.types import StreamedChatResponse
from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder
from fastapi import Form, HTTPException
from langchain_core.agents import AgentActionMessageLog
from langchain_core.runnables.utils import AddableDict
from sse_starlette.sse import EventSourceResponse

from backend.chat.custom.custom import CustomChat
from backend.chat.custom.langchain import LangChainChat
from backend.chat.enums import StreamEvent
from backend.config.tools import AVAILABLE_TOOLS

from backend.crud import message as message_crud
from backend.crud import annotation as annotation_crud

from backend.models import get_session
from backend.models.citation import Citation
from backend.models.conversation import Conversation
from backend.models.database import DBSessionDep
from backend.models.document import Document
from backend.models.annotation import Annotation
from backend.models.message import Message
from backend.schemas.chat import (
    BaseAnnotationRequest,
    ChatMessage,
    ChatResponseEvent,
    ChatRole,
    NonStreamedChatResponse,
    StreamCitationGeneration,
    StreamEnd,
    StreamSearchQueriesGeneration,
    StreamSearchResults,
    StreamStart,
    StreamTextGeneration,
    StreamToolCallsGeneration,
    StreamToolInput,
    StreamToolResult,
    ToolInputType,
)
from backend.schemas.cohere_chat import CohereChatRequest
# from backend.schemas.message import UpdateMessageAnnotations
from backend.schemas.file import UpdateFile
from backend.schemas.langchain_chat import LangchainChatRequest
from backend.schemas.search_query import SearchQuery
from backend.schemas.tool import ToolCall
from backend.services.request_validators import (
    validate_chat_request,
    validate_deployment_header,
    validate_user_header,
)

router = APIRouter(
    prefix="/annotations",
    dependencies=[
        Depends(get_session),
        Depends(validate_user_header),
    ]
)


@router.put("/{annotation_id}/add")
async def annotate(
    session: DBSessionDep,
    annotation_id: str,
    annotation_request: BaseAnnotationRequest,
    request: Request,
) -> None:
    """
    Stream chat endpoint to handle user messages and return chatbot responses.

    Args:
        session (DBSessionDep): Database session.
        chat_request (CohereChatRequest): Chat request data.
        request (Request): Request object.

    Returns:
        EventSourceResponse: Server-sent event response with chatbot responses.
    """
    
    print("process annot")
    process_annotation(session, annotation_request, request, annotation_id)

    return None


def process_annotation(
    session: DBSessionDep, annotation_request: BaseAnnotationRequest, request: Request, annotation_id: str,
) -> None:
    """
    Process a annotation request.

    Args:
        chat_request (BaseChatRequest): Chat request data.
        session (DBSessionDep): Database session.
        request (Request): Request object.

    Returns:
        Tuple: Tuple containing necessary data to construct the responses.
    """
    user_id = request.headers.get("User-Id", "")
    deployment_name = request.headers.get("Deployment-Name", "")
    should_store = True
    
    # Get position to put next message in
    message = message_crud.get_message(session,annotation_request.message_id,user_id)
    print(annotation_request.message_id)
    print(message)
    print("PROCESSING MSG")

    new_annotation = create_annotation(
        session,
        message.conversation_id,
        annotation_request.message_id,
        user_id,
        annotation_request.htext,
        annotation_request.annotation,
        annotation_request.start,
        annotation_request.end,
        should_store=True,
        id=annotation_id
        )
    
    new_annotations = create_new_annotation_list(message, new_annotation)
    update_annotations_after_add(session, new_annotation)

def create_new_annotation_list(msg: Message, new_annot: Annotation) -> List[Annotation]:
    """
    Gets annotation position to create next annotaiton.

    Args:
        conversation (Conversation): current Conversation.

    Returns:
        int: Position to save new messages with
    """

    annotations = msg.annotations
    return annotations.append(new_annot)


def create_annotation(
    session: DBSessionDep,
    conversation_id: str,
    message_id: str,
    user_id: str,
    htext: str,
    annotation: str,
    start: int,
    end: int,
    should_store: bool = True,
    id: str | None = None,
) -> Annotation:
    """
    Create a message object and store it in the database.

    Args:
        session (DBSessionDep): Database session.
        chat_request (BaseChatRequest): Chat request data.
        conversation_id (str): Conversation ID.
        user_id (str): User ID.
        user_message_position (int): User message position.
        id (str): Message ID.
        text (str): Message text.
        agent (MessageAgent): Message agent.
        should_store (bool): Whether to store the message in the database.

    Returns:
        Message: Message object.
    """
    annotation = Annotation(
        id=id,
        user_id=user_id,
        conversation_id=conversation_id,
        message_id=message_id,
        htext=htext,
        annotation=annotation,
        start=start,
        end=end,
        #position=annot_position,
    )

    if should_store:
        return annotation_crud.create_annotation(session, annotation)
    return annotation


def update_annotations_after_add(
    session: DBSessionDep,
    response_annotation: Annotation,
) -> None:
    """
    Updates teh annotation list in a message.

    Args:
        session (DBSessionDep): Database session.
        response_message (Message): Response message object.
        conversation_id (str): Conversation ID.
        final_message_text (str): Final message text.
    """
    print("annot making!")
    annotation_crud.create_annotation(session, response_annotation)

    # message = message_crud.get_message(session, message_id, user_id)

    # new_anntotations = UpdateMessageAnnotations(
    #     annotations=annots,
    # )
    # message_crud.update_message(session, message, new_anntotations)


@router.delete("/{annotation_id}")
async def delete_annotation(
    annotation_id: str, session: DBSessionDep, request: Request
) -> None:
    """
    Annotation by ID.

    Args:
        conversation_id (str): Conversation ID.
        file_id (str): File ID.
        session (DBSessionDep): Database session.

    Returns:
        DeleteFile: Empty response.

    Raises:
        HTTPException: If the conversation with the given ID is not found.
    """
    user_id = request.headers.get("User-Id", "")
    annotation = annotation_crud.get_annotation(session, annotation_id)
    print(annotation)
    if not annotation:
        raise HTTPException(
            status_code=404,
            detail=f"Annotation with ID: {annotation_id} not found.",
        )

    annotation_crud.delete_annotation(session, annotation_id)
