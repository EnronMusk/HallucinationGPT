import logging
from typing import List

from fastapi import HTTPException

from backend.chat.custom.custom import CustomChat
from backend.crud import conversation as conversation_crud
from backend.database_models.conversation import Conversation
from backend.database_models.conversation import Conversation as ConversationModel
from backend.database_models.database import DBSessionDep
from backend.schemas.chat import ChatRole
from backend.schemas.cohere_chat import CohereChatRequest
from backend.services.chat import generate_chat_response

DEFAULT_TITLE = "New Conversation"
GENERATE_TITLE_PROMPT = """# TASK
Given the following conversation history, write a short title that summarizes the topic of the conversation. Be concise and respond with just the title.

## START CHATLOG
%s
## END CHATLOG

# TITLE
"""
SEARCH_RELEVANCE_THRESHOLD = 0.3


def validate_conversation(
    session: DBSessionDep, conversation_id: str, user_id: str
) -> ConversationModel:
    """Validates if a conversation exists and belongs to the user

    Args:
        session (DBSessionDep): Database session
        conversation_id (str): Conversation ID
        user_id (str): User ID

    Returns:
        ConversationModel: Conversation object

    Raises:
        HTTPException: If the conversation is not found
    """
    conversation = conversation_crud.get_conversation(session, conversation_id, user_id)
    if not conversation:
        raise HTTPException(
            status_code=404,
            detail=f"Conversation with ID: {conversation_id} not found.",
        )
    return conversation


def extract_details_from_conversation(
    convo: Conversation,
    num_turns: int = 5,
    ignore_system: str = True,
    ignore_tool: str = True,
) -> str:
    """Extracts the last num_turns from a conversation, ignoring system and tool messages

    Args:
        convo (Conversation): The conversation object
        num_turns (int): The number of turns to extract
        ignore_system (bool): Whether to ignore system messages
        ignore_tool (bool): Whether to ignore tool messages

    Returns:
        str: The extracted chatlog
    """
    messages = convo.messages
    len_messages = len(messages)
    num_turns = min(len_messages, num_turns)
    start_turn = len_messages - num_turns

    turns = []
    for i in range(start_turn, len_messages):
        message = messages[i]

        # Ignore tool messages
        if ignore_tool and message.agent == ChatRole.TOOL:
            continue

        if ignore_system and message.agent == ChatRole.SYSTEM:
            continue

        # <Role>: <Message>
        turn_str = message.agent + ": " + message.text
        turns.append(turn_str)

    chatlog = "\n".join(turns)
    return chatlog


def get_documents_to_rerank(conversations: List[Conversation]) -> List[str]:
    """Get documents (strings) to rerank from a list of conversations

    Args:
        conversations (List[Conversation]): List of conversations

    Returns:
        List[str]: List of documents to rerank
    """
    rerank_documents = []
    for conversation in conversations:
        chatlog = extract_details_from_conversation(conversation)

        document = f"Title: {conversation.title}\n"
        if len(chatlog.strip()) != 0:
            document += "\nChatlog:\n{chatlog}"

        rerank_documents.append(document)

    return rerank_documents


async def filter_conversations(
    query: str,
    conversations: List[Conversation],
    rerank_documents: List[str],
    model_deployment,
    user_id: str,
    agent_id: str,
    trace_id: str,
) -> List[Conversation]:
    """Filter conversations based on the rerank score and title matches"""
    
    # if rerank is not enabled, filter by simple string matching
    if not model_deployment.rerank_enabled:
        filtered_conversations = []
        query_lower = query.lower()

        for rerank_document, conversation in zip(rerank_documents, conversations):
            # Check both title and content
            if (query_lower in rerank_document.lower() or 
                (conversation.title and query_lower in conversation.title.lower())):
                filtered_conversations.append(conversation)

        return filtered_conversations

    # Rerank documents
    res = await model_deployment.invoke_rerank(
        query=query,
        documents=rerank_documents,
        user_id=user_id,
        agent_id=agent_id,
        trace_id=trace_id,
    )

    # Sort conversations by rerank score
    res["results"].sort(key=lambda x: x["relevance_score"], reverse=True)

    # Filter out conversations with low relevance score
    reranked_conversations = [
        conversations[r["index"]]
        for r in res["results"]
        if r["relevance_score"] > SEARCH_RELEVANCE_THRESHOLD
    ]

    # Add any direct title matches that might have been missed
    query_lower = query.lower()
    title_matches = [
        conv for conv in conversations 
        if conv.title and 
        query_lower in conv.title.lower() and 
        conv not in reranked_conversations
    ]

    # Combine results, putting title matches first
    return title_matches + reranked_conversations


async def generate_conversation_title(
    request,
    session,
    conversation,
    deployment_name,
    model_config,
    trace_id,
    user_id,
    agent_id,
):
    """Generate a title for a conversation

    Args:
        request: Request object
        session: Database session
        conversation: Conversation object
        deployment_name: Deployment name
        model_config: Model configuration
        trace_id: Trace ID
        user_id: User ID
        agent_id: Agent ID

    Returns:
        str: Generated title
    """
    title = ""
    try:
        chatlog = extract_details_from_conversation(conversation)
        prompt = GENERATE_TITLE_PROMPT % chatlog
        chat_request = CohereChatRequest(
            message=prompt,
        )

        response = await generate_chat_response(
            request,
            session,
            CustomChat().chat(
                chat_request,
                stream=False,
                deployment_name=deployment_name,
                deployment_config=model_config,
                trace_id=trace_id,
                user_id=user_id,
                agent_id=agent_id,
            ),
            response_message=None,
            conversation_id=None,
            user_id=user_id,
            should_store=False,
        )

        title = response.text
    except Exception as e:
        title = DEFAULT_TITLE
        logging.error(f"Error generating title for conversation {conversation.id}: {e}")

    return title
