from sqlalchemy.orm import Session
import traceback
from sqlalchemy.exc import SQLAlchemyError

from backend.database_models.user import User
from backend.schemas.user import UpdateUser


def create_user(db: Session, user: User) -> User:
    """ "
    Create a new user.

    Args:
        db (Session): Database session.
        user (User): User data to be created.

    Returns:
        User: Created user.
    """
    try:
        print(f"Creating user in database: {user.__dict__}")
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user: {user.id}, fullname: {user.fullname}")
        return user
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error creating user: {str(e)}")
        traceback.print_exc()
        raise
    except Exception as e:
        db.rollback()
        print(f"Unexpected error creating user: {str(e)}")
        traceback.print_exc()
        raise


def get_user(db: Session, user_id: str) -> User:
    """
    Get a user by ID.

    Args:
        db (Session): Database session.
        user_id (str): User ID.

    Returns:
        User: User with the given ID.
    """
    return db.query(User).filter(User.id == user_id).first()


def get_users(db: Session, offset: int = 0, limit: int = 100) -> list[User]:
    """
    List all users.

    Args:
        db (Session): Database session.
        offset (int): Offset to start the list.
        limit (int): Limit of users to be listed.

    Returns:
        list[User]: List of users.
    """
    return db.query(User).offset(offset).limit(limit).all()


def update_user(db: Session, user: User, new_user: UpdateUser) -> User:
    """
    Update a user by ID.

    Args:
        db (Session): Database session.
        user (User): User to be updated.
        new_user (User): New user data.

    Returns:
        User: Updated user.
    """
    for attr, value in new_user.model_dump(exclude_none=True).items():
        setattr(user, attr, value)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: str) -> None:
    """
    Delete a user by ID.

    Args:
        db (Session): Database session.
        user_id (str): User ID.
    """
    user = db.query(User).filter(User.id == user_id)
    user.delete()
    db.commit()


def get_or_create_user(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
