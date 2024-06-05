from sqlalchemy.orm import Session

from backend.models.annotation import Annotation

def create_annotation(db: Session, annotation: Annotation) -> Annotation:
    """
    Create a new Annotation.

    Args:
        db (Session): Database session.
        Annotation (Annotation): Annotation data to be created.

    Returns:
        Annotation: Created Annotation.
    """
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


def get_annotation(db: Session, annotation_id: str) -> Annotation:
    """
    Get a Annotation by ID.

    Args:
        db (Session): Database session.
        Annotation_id (str): Annotation ID.

    Returns:
        Annotation: Annotation with the given ID.
    """
    print(annotation_id)
    return db.query(Annotation).filter(Annotation.id == annotation_id).first()


def get_annotations(db: Session, offset: int = 0, limit: int = 999) -> list[Annotation]:
    """
    List all Annotations.

    Args:
        db (Session): Database session.
        offset (int): Offset to start the list.
        limit (int): Limit of Annotations to be listed.

    Returns:
        list[Annotation]: List of Annotations.
    """
    return db.query(Annotation).offset(offset).limit(limit).all()


def delete_annotation(db: Session, annotation_id: str) -> None:
    """
    Delete a Annotation by ID.

    Args:
        db (Session): Database session.
        Annotation_id (str): Annotation ID.
    """
    annot = db.query(Annotation).filter(Annotation.id == annotation_id)
    annot.delete()
    db.commit()

