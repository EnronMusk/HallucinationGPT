from fastapi import APIRouter, HTTPException, Request
from datetime import datetime

from backend.config.routers import RouterName
from backend.crud import user as user_crud
from backend.database_models import User as UserModel
from backend.database_models.database import DBSessionDep
from backend.routers.utils import (
    add_agent_to_request_state,
    add_event_type_to_request_state,
    add_session_user_to_request_state,
    add_user_to_request_state,
)
from backend.schemas.metrics import MetricsMessageType
from backend.schemas.user import CreateUser, DeleteUser, UpdateUser
from backend.schemas.user import User
from backend.schemas.user import User as UserSchema

router = APIRouter(prefix="/v1/users")
router.name = RouterName.USER


@router.put("/add", response_model=User)
async def create_user(
    user: CreateUser, session: DBSessionDep, request: Request
) -> User:
    """
    Create a new user.

    Args:
        user (CreateUser): User data to be created.
        session (DBSessionDep): Database session.
        request (Request): FastAPI request object.

    Returns:
        User: Created user.
    """
    try:
        print("Creating user!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        user_data = user.model_dump(exclude_none=True)
        headers_dict = dict(request.headers)  # Convert Headers to dict
        user_data["headers"] = headers_dict
        try:
            user_data["ip_address"] = request.client.host
        except:
            user_data["ip_address"] = "NA"
        user_data["id"] = request.headers.get("user-id")  # Use the ID from header
        
        db_user = UserModel(**user_data)
        db_user = user_crud.create_user(session, db_user)
        add_user_to_request_state(request, db_user)
        add_event_type_to_request_state(request, MetricsMessageType.USER_CREATED)
        
        # Debug what we're returning
        print(f"db_user type: {type(db_user)}")
        print(f"db_user attributes: {dir(db_user)}")
        
        # Simplified conversion to Pydantic model
        try:
            # Convert to dict using SQLAlchemy model's __dict__
            user_dict = {}
            for key, value in db_user.__dict__.items():
                if not key.startswith('_'):  # Skip SQLAlchemy internal attrs
                    user_dict[key] = value
            
            print(f"User dict before Pydantic conversion: {user_dict}")
            
            # Create and return Pydantic model
            return User(**user_dict)
        except Exception as e:
            print(f"Error converting to response model: {e}")
            # Fallback direct serialization with all fields explicitly set
            user_response = User(
                id=db_user.id,
                created_at=db_user.created_at or datetime.now(),
                updated_at=db_user.updated_at or datetime.now()
            )
            print(f"Manual user response: {user_response}")
            return user_response
    except Exception as e:
        print(f"Error in create_user: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[User])
async def list_users(
    *, offset: int = 0, limit: int = 100, session: DBSessionDep
) -> list[User]:
    """
    List all users.

    Args:
        offset (int): Offset to start the list.
        limit (int): Limit of users to be listed.
        session (DBSessionDep): Database session.

    Returns:
        list[User]: List of users.
    """
    return user_crud.get_users(session, offset=offset, limit=limit)


@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str, session: DBSessionDep, request: Request) -> User:
    """
    Get a user by ID.

    Args:
        user_id (str): User ID.
        session (DBSessionDep): Database session.

        Returns:
        User: User with the given ID.

    Raises:
        HTTPException: If the user with the given ID is not found.
    """

    user = user_crud.get_user(session, user_id)
    if not user:
        raise HTTPException(
            status_code=404, detail=f"User with ID: {user_id} not found."
        )

    add_session_user_to_request_state(request, session)
    return user


@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: str, new_user: UpdateUser, session: DBSessionDep, request: Request
) -> User:
    """
    Update a user by ID.

    Args:
        user_id (str): User ID.
        new_user (UpdateUser): New user data.
        session (DBSessionDep): Database session.

    Returns:
        User: Updated user.

    Raises:
        HTTPException: If the user with the given ID is not found.
    """
    user = user_crud.get_user(session, user_id)
    add_event_type_to_request_state(request, MetricsMessageType.USER_UPDATED)

    if not user:
        raise HTTPException(
            status_code=404, detail=f"User with ID: {user_id} not found."
        )

    user = user_crud.update_user(session, user, new_user)
    add_session_user_to_request_state(request, session)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str, session: DBSessionDep, request: Request
) -> DeleteUser:
    """ "
    Delete a user by ID.

    Args:
        user_id (str): User ID.
        session (DBSessionDep): Database session.

    Returns:
        DeleteUser: Empty response.

    Raises:
        HTTPException: If the user with the given ID is not found.
    """
    user = user_crud.get_user(session, user_id)

    if not user:
        raise HTTPException(
            status_code=404, detail=f"User with ID: {user_id} not found."
        )

    add_event_type_to_request_state(request, MetricsMessageType.USER_DELETED)
    add_session_user_to_request_state(request, session)
    user_crud.delete_user(session, user_id)

    return DeleteUser()
