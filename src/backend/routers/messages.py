from fastapi import APIRouter, Depends
from fastapi import File as RequestFile
from fastapi import Form, HTTPException, Request
from fastapi import UploadFile as FastAPIUploadFile

from backend.crud import message as message_crud
from backend.models import Message as MessageModel
from backend.models import get_session
from backend.models.database import DBSessionDep
from backend.schemas.message import (
    Message,
    UpdateMessage,
)
from backend.services.request_validators import validate_user_header

router = APIRouter(
    prefix="/messages",
    dependencies=[Depends(get_session), Depends(validate_user_header)],
)


@router.put('/{message_id}', response_model=Message)
def get_message(
    message_id: str,
    session: DBSessionDep,
    request: Request,
) -> Message:
    '''
    Gets a message by ID.

    Args:
        message_id (int): Message ID.
        new_message (UpdateMessage): New message data.
        session (Session): Database session.
        request (Request): Request object.

    Returns:
        Message: Updated message.

    Raises:
        HTTPException: If the message with the given ID is not found.
    '''

    user_id = request.headers.get("User-Id")
    message = message_crud.get_message(session, message_id, user_id)

    if not message:
        raise HTTPException(
            status_code=404,
            detail=f'Message with ID: {message_id} not found.',
        )

    return message

@router.put('/{message_id}', response_model=Message)
def update_message(
    message_id: str,
    new_message: UpdateMessage,
    session: DBSessionDep,
    request: Request,
) -> Message:
    '''
    Update a message by ID, and potentially update the conversation.

    Args:
        message_id (int): Message ID.
        new_message (UpdateMessage): New message data.
        session (Session): Database session.
        request (Request): Request object.

    Returns:
        Message: Updated message.

    Raises:
        HTTPException: If the message with the given ID is not found.
    '''

    user_id = request.headers.get("User-Id")
    message = message_crud.get_message(session, message_id, user_id)

    if not message:
        raise HTTPException(
            status_code=404,
            detail=f'Message with ID: {message_id} not found.',
        )

    updated_message = message_crud.update_message(session, message, new_message)

    return updated_message
