import datetime
from typing import List, Union

from pydantic import BaseModel

from backend.models.message import MessageAgent
from backend.schemas.citation import Citation
from backend.schemas.document import Document
from backend.schemas.file import File

# annotations import
from backend.schemas.annotation import Annotation


class MessageBase(BaseModel):
    text: str


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

    agent: MessageAgent

    class Config:
        from_attributes = True


class UpdateMessage(MessageBase):
    pass

