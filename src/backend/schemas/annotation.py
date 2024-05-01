import datetime

from pydantic import BaseModel, Field
from typing import List, Optional, Union

class AnnotationBase(BaseModel):
    htext: str

class Annotation(AnnotationBase):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    start: int
    end: int
    annotation: str

    class Config:
        from_attributes = True

class ListAnnotation(Annotation):
    pass


class AddAnnotation(Annotation):
    pass


class DeleteAnnotation(BaseModel):
    pass


