from fastapi import Header, Depends, APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from database.supabase_client import supabase
import logging

# --------------------------------
# Logging Configuration
# --------------------------------
logger = logging.getLogger(__name__)

# --------------------------------
# Router Setup
# --------------------------------
router = APIRouter(tags=["CRUD Operations"])

# --------------------------------
# Pydantic Request Models
# --------------------------------
class UserRegisterRequest(BaseModel):
    email: str
    name: Optional[str] = "User"

class ChatCreateRequest(BaseModel):
    user_email: str
    title: Optional[str] = "New Chat"

class MessageStoreRequest(BaseModel):
    session_id: str
    role: str
    content: str

# --------------------------------
# User Management
# --------------------------------
def get_or_create_user(email: str, name="Test User"):
    """
    Retrieves existing user by email or creates a new one.
    
    Args:
        email: User's email address
        name: User's display name (default: "Test User")
    
    Returns:
        dict: User record from database
    
    Raises:
        HTTPException: If database operation fails
    """
    try:
        logger.info(f"Looking up user: {email}")
        res = supabase.table("users").select("*").eq("email", email).execute()
        
        if res.data:
            logger.info(f"User found: {email}")
            return res.data[0]

        logger.info(f"Creating new user: {email}")
        user = supabase.table("users").insert({
            "email": email,
            "name": name
        }).execute()

        logger.info(f"User created successfully: {email}")
        return user.data[0]
    
    except Exception as e:
        logger.error(f"Error in get_or_create_user for {email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get or create user: {str(e)}"
        )

# --------------------------------
# Chat Session Management
# --------------------------------
def create_chat_session(user_id: str, title: str):
    """
    Creates a new chat session for a user.
    
    Args:
        user_id: ID of the user
        title: Title/name of the chat session
    
    Returns:
        dict: Chat session record from database
    
    Raises:
        HTTPException: If database operation fails
    """
    try:
        logger.info(f"Creating chat session for user_id={user_id}, title={title}")
        res = supabase.table("chat_sessions").insert({
            "user_id": user_id,
            "title": title
        }).execute()

        logger.info(f"Chat session created: {res.data[0]['id']}")
        return res.data[0]
    
    except Exception as e:
        logger.error(f"Error creating chat session for user_id={user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chat session: {str(e)}"
        )

# --------------------------------
# Message Storage
# --------------------------------
def store_message(session_id: str, role: str, content: str):
    """
    Stores a message in a chat session.
    
    Args:
        session_id: ID of the chat session
        role: Message role ("user" or "assistant")
        content: Message content text
    
    Raises:
        HTTPException: If database operation fails
    """
    try:
        logger.debug(f"Storing {role} message in session {session_id}")
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content
        }).execute()
        logger.debug(f"Message stored successfully")
    
    except Exception as e:
        logger.error(f"Error storing message in session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store message: {str(e)}"
        )


# --------------------------------
# Message Retrieval
# --------------------------------
def get_messages(session_id: str):
    """
    Retrieves all messages from a chat session in chronological order.
    
    Args:
        session_id: ID of the chat session
    
    Returns:
        list: List of message records ordered by creation time
    
    Raises:
        HTTPException: If database operation fails
    """
    try:
        logger.debug(f"Fetching messages for session {session_id}")
        res = supabase.table("messages") \
            .select("*") \
            .eq("session_id", session_id) \
            .order("created_at") \
            .execute()

        logger.debug(f"Retrieved {len(res.data)} messages")
        return res.data
    
    except Exception as e:
        logger.error(f"Error fetching messages for session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve messages: {str(e)}"
        )

# --------------------------------
# Dependencies
# --------------------------------
def mock_user(x_user_email: str = Header()):
    """
    FastAPI dependency for extracting user info from request header.
    
    Args:
        x_user_email: Email from X-User-Email header
    
    Returns:
        dict: User information (email and name)
    """
    return {
        "email": x_user_email,
        "name": "Test User"
    }

# --------------------------------
# Test Endpoints
# --------------------------------
@router.post("/test/session")
def test_session(user=Depends(mock_user)):
    """
    Test endpoint to verify complete CRUD flow:
    1. Get or create user
    2. Create chat session
    3. Store sample messages
    
    Returns:
        dict: Created user and session information
    """
    try:
        logger.info(f"Test session requested for user: {user['email']}")
        
        # Step 1: Get or create user
        db_user = get_or_create_user(user["email"])
        
        # Step 2: Create chat session
        session = create_chat_session(db_user["id"], "Test Chat")
        
        # Step 3: Store test messages
        store_message(session["id"], "user", "Hello")
        store_message(session["id"], "assistant", "Hi there!")
        
        logger.info(f"Test session completed successfully for user: {user['email']}")
        
        return {
            "user": db_user,
            "session": session,
            "status": "success"
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions from CRUD functions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in test_session: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test session failed: {str(e)}"
        )

# --------------------------------
# User Registration Endpoint
# --------------------------------
@router.post("/users/register")
def register_user(request: UserRegisterRequest):
    """
    Register or retrieve user by email.
    
    Args:
        request: User registration request with email and name
    
    Returns:
        dict: User information
    """
    logger.info(f"User registration/retrieval for: {request.email}")
    user = get_or_create_user(request.email, request.name)
    return user

# --------------------------------
# Chat Session Creation Endpoint
# --------------------------------
@router.post("/chat/create")
def create_new_chat(request: ChatCreateRequest):
    """
    Create a new chat session for a user.
    
    Args:
        request: Chat creation request with user_email and title
    
    Returns:
        dict: Created chat session information
    """
    logger.info(f"Creating chat for user: {request.user_email}")
    
    # Get or create user first
    user = get_or_create_user(request.user_email)
    
    # Create chat session
    session = create_chat_session(user["id"], request.title)
    
    return {
        "user": user,
        "session": session
    }

# --------------------------------
# Get User Chat Sessions Endpoint
# --------------------------------
@router.get("/chat/sessions/{user_email}")
def get_user_sessions(user_email: str):
    """
    Get all chat sessions for a user.
    
    Args:
        user_email: User's email address
    
    Returns:
        dict: List of user's chat sessions
    """
    try:
        logger.info(f"Fetching sessions for user: {user_email}")
        
        # Get user first
        user_res = supabase.table("users").select("id").eq("email", user_email).execute()
        
        if not user_res.data:
            return {
                "sessions": [],
                "message": "User not found"
            }
        
        user_id = user_res.data[0]["id"]
        
        # Get all sessions for this user
        sessions_res = supabase.table("chat_sessions") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        logger.info(f"Found {len(sessions_res.data)} sessions for user {user_email}")
        
        return {
            "sessions": sessions_res.data,
            "user_id": user_id
        }
    
    except Exception as e:
        logger.error(f"Error fetching sessions for {user_email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch sessions: {str(e)}"
        )

# --------------------------------
# Store Message Endpoint
# --------------------------------
@router.post("/messages/store")
def store_new_message(request: MessageStoreRequest):
    """
    Store a message in a chat session.
    
    Args:
        request: Message storage request with session_id, role, and content
    
    Returns:
        dict: Success status
    """
    logger.info(f"Storing {request.role} message in session: {request.session_id}")
    store_message(request.session_id, request.role, request.content)
    
    return {
        "success": True,
        "session_id": request.session_id,
        "role": request.role
    }

# --------------------------------
# Message Retrieval Endpoint
# --------------------------------
@router.get("/messages/{session_id}")
def fetch_messages(session_id: str):
    """
    Retrieves all messages from a chat session.
    
    Args:
        session_id: ID of the chat session
    
    Returns:
        dict: List of messages with session metadata
    """
    logger.info(f"Fetch messages requested for session: {session_id}")
    messages = get_messages(session_id)
    
    return {
        "session_id": session_id,
        "message_count": len(messages),
        "messages": messages
    }
