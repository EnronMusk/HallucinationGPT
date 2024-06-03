import datetime

from pydantic import BaseModel, Field


class Annotation(BaseModel):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    start: int
    end: int
    htext: str
    annotation: str

    position: int


    class Config:
        from_attributes = True


class ListAnnotation(Annotation):
    pass


class AddAnnotation(Annotation):
    pass


class DeleteAnnotation(BaseModel):
    pass


