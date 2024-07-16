from sqlalchemy import ForeignKey, Index, String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class Annotation(Base):
    __tablename__ = "annotations"

    # TODO: Swap to foreign key once User management implemented
    user_id: Mapped[str] = mapped_column(String)
    message_id: Mapped[str] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE")
    )
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE")
    )

    start: Mapped[int] = mapped_column(Integer)
    end: Mapped[int] = mapped_column(Integer)
    htext: Mapped[str] = mapped_column(String)
    annotation: Mapped[str] = mapped_column(String)

    __table_args__ = (
        Index("annotations_conversation_id_message_id", conversation_id, message_id),   
        Index("annotations_conversation_id", conversation_id),
        Index("annotations_message_id", message_id),
        Index("annotations_user_id", user_id),
    )
