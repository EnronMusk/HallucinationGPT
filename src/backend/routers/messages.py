from fastapi import APIRouter, Depends
from fastapi import File as RequestFile
from fastapi import Form, HTTPException, Request
from fastapi import UploadFile as FastAPIUploadFile
from sqlalchemy.orm import Session
from typing import Dict
from backend.database_models.database import DBSessionDep

from backend.crud import message as message_crud
from backend.schemas.message import (
    Message,
    UpdateMessage,
    UpdateMessageFeedback,
)
from backend.services.request_validators import validate_user_header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
import logging

router = APIRouter(
    prefix="/messages",
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

@router.post("/{message_id}/feedback", response_model=Dict[str, str])
def update_message_feedback(
    message_id: str,
    feedback_data: dict,
    session: DBSessionDep
):
    """
    Update message feedback using the message ID in the URL.
    """
    # Extract feedback from request
    feedback = feedback_data.get("feedback")
    
    if feedback is None:
        raise HTTPException(status_code=400, detail="Missing feedback")
    
    # Use the CRUD function directly
    success = message_crud.update_message_feedback(
        db=session,
        message_id=message_id,  # Get message_id from path parameter
        feedback=str(feedback)  # Convert to string in case it's a number
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"status": "success", "message": "Feedback updated successfully"}

@router.post("", response_model=Dict[str, str])
def process_message_action(
    data: dict,
    session: DBSessionDep
):
    """
    Process various message actions including feedback
    """
    action = data.get("action")
    
    # Handle feedback updates
    if action == "update_feedback":
        message_id = data.get("message_id")
        feedback = data.get("feedback")
        
        if not message_id or feedback is None:
            raise HTTPException(status_code=400, detail="Missing message_id or feedback")
        
        success = message_crud.update_message_feedback(
            db=session,
            message_id=message_id,
            feedback=str(feedback)
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Message not found")
        
        return {"status": "success", "message": "Feedback updated successfully"}
    
    # Handle other actions as needed
    
    raise HTTPException(status_code=400, detail="Unknown action")
