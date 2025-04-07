import datetime
from typing import List, Union, Optional

from pydantic import BaseModel, Field

from backend.database_models.message import MessageAgent
from backend.schemas.citation import Citation
from backend.schemas.document import Document
from backend.schemas.file import File

# annotations import
from backend.schemas.annotation import Annotation
from backend.schemas.tool import ToolCall


class MessageBase(BaseModel):
    text: str

class UpdateMessageFeedback(BaseModel):
    message_id: str
    feedback: int


class Message(MessageBase):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    generation_id: Union[str, None]

    position: int
    is_active: bool

    documents: List[Document]
    citations: List[Citation]
    files: List[File]
    annotations: List[Annotation] #added annotaitons
    tool_calls: List[ToolCall]
    tool_plan: Union[str, None]

    is_annotation_response: Optional[bool] = None
    feedback: Optional[str] = None

    agent: MessageAgent

    class Config:
        from_attributes = True


class UpdateMessage(MessageBase):
    pass


class FeedbackRequest(BaseModel):
    """
    Schema for submitting feedback on a message.
    """
    message_id: str = Field(..., description="ID of the message to provide feedback for")
    feedback: str = Field(..., description="Feedback content")

