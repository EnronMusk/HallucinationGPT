from sqlalchemy import ForeignKey, Index, String, Integer, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.database_models.base import Base
import uuid as uuid4


class Annotation(Base):
    __tablename__ = "annotations"

    # TODO: Swap to foreign key once User management implemented
    id: Mapped[str] = mapped_column(String, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=True)
    message_id: Mapped[str] = mapped_column(
        ForeignKey("messages.id", ondelete="CASCADE")
    )
    # conversation_id: Mapped[str] = mapped_column(
    #     ForeignKey("conversations.id", ondelete="CASCADE")
    # )

    conversation_id: Mapped[str] = mapped_column(String, nullable=True)

    start: Mapped[int] = mapped_column(Integer)
    end: Mapped[int] = mapped_column(Integer)
    htext: Mapped[str] = mapped_column(String)
    annotation: Mapped[str] = mapped_column(String)

    __table_args__ = (
        PrimaryKeyConstraint("id", name="annotation_pkey"),
        Index("annotations_conversation_id_message_id", conversation_id, message_id),   
        Index("annotations_conversation_id", conversation_id),
        Index("annotations_user_message_id", user_id, message_id),
        Index("annotations_message_id", message_id),
        Index("annotations_user_id", user_id),
    )
