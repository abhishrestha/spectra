from typing import TypedDict, Annotated, Union, List, AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio
import warnings
import logging
import sys
from contextlib import asynccontextmanager

from langgraph.graph import add_messages, StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, ToolMessage

# --------------------------------
# Load environment variables
# --------------------------------
load_dotenv()

# --------------------------------
# Logging Configuration
# --------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Suppress Tavily deprecation warning while using the community fallback
warnings.filterwarnings(
    "ignore",
    message=".*TavilySearchResults.*deprecated.*langchain-tavily.*",
    category=DeprecationWarning,
)

# --------------------------------
# Application Lifespan Manager
# --------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown lifecycle.
    - Validates database connection
    - Initializes CRUD operations
    - Loads AI models and tools
    """
    logger.info("=" * 60)
    logger.info("Starting GenAI FullStack Application Backend")
    logger.info("=" * 60)
    
    try:
        # Import database client to trigger connection validation
        from database.supabase_client import supabase
        logger.info("✓ Database connection initialized")
        
        # Verify database connectivity by attempting a simple query
        try:
            # Test connection with a simple query
            supabase.table("users").select("id").limit(1).execute()
            logger.info("✓ Database connection verified")
        except Exception as db_error:
            logger.error(f"✗ Database connection test failed: {db_error}")
            logger.warning("Application will continue but database operations may fail")
        
        # CRUD operations are loaded via router import (already done below)
        logger.info("✓ CRUD operations loaded from crud.py")
        
        # AI components already initialized (LLM, tools, graph)
        logger.info("✓ AI chat components initialized (LLM + LangGraph)")
        
        logger.info("=" * 60)
        logger.info("Backend is ready to accept requests")
        logger.info("=" * 60)
        
    except Exception as startup_error:
        logger.error(f"Critical error during startup: {startup_error}")
        raise
    
    yield  # Application runs here
    
    # Shutdown logic
    logger.info("Shutting down application...")
    logger.info("✓ Cleanup complete")

# --------------------------------
# FastAPI app
# --------------------------------
app = FastAPI(
    title="AI Search API",
    version="1.0",
    lifespan=lifespan  # Attach lifespan manager
)

# --------------------------------
# CORS Configuration
# --------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "https://spectra-six-jet.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------
# Global Exception Handlers
# --------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handles validation errors with clear error messages.
    """
    logger.error(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Catches all unhandled exceptions to prevent crashes.
    """
    logger.error(f"Unhandled exception on {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred"},
    )

# --------------------------------
# Include Routers (CRUD operations)
# --------------------------------
from crud.crud import router as crud_router
app.include_router(crud_router)
logger.info("✓ CRUD router registered")

# --------------------------------
# LLM + Tools
# --------------------------------
model = ChatOpenAI(model="gpt-4o")

search_tool = TavilySearchResults(max_results=3)
tools = [search_tool]

llm_with_tools = model.bind_tools(tools=tools)

# --------------------------------
# Memory
# --------------------------------
memory = MemorySaver()

# --------------------------------
# State Definition
# --------------------------------
class State(TypedDict):
    messages: Annotated[list, add_messages]

# --------------------------------
# Graph Nodes
# --------------------------------
async def model_node(state: State):
    result = await llm_with_tools.ainvoke(state["messages"])
    return {"messages": [result]}

async def tools_router(state: State):
    last_message = state["messages"][-1]

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tool_node"

    return END

async def tool_node(state: State):
    tool_calls = state["messages"][-1].tool_calls
    tool_messages = []

    for tool_call in tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        if tool_name == "tavily_search_results_json":
            result = await search_tool.ainvoke(tool_args)

            tool_messages.append(
                ToolMessage(
                    content=str(result),
                    tool_call_id=tool_id,
                    name=tool_name,
                )
            )

    return {"messages": tool_messages}

# --------------------------------
# Build Graph
# --------------------------------
graph_builder = StateGraph(State)

graph_builder.add_node("model", model_node)
graph_builder.add_node("tool_node", tool_node)

graph_builder.set_entry_point("model")
graph_builder.add_conditional_edges("model", tools_router)
graph_builder.add_edge("tool_node", "model")

graph = graph_builder.compile(checkpointer=memory)

# --------------------------------
# Request Schema
# --------------------------------
class ChatRequest(BaseModel):
    message: str

# --------------------------------
# API Endpoints
# --------------------------------
@app.get("/")
def health_check():
    """
    Health check endpoint to verify server status.
    """
    logger.info("Health check requested")
    return {
        "status": "Server running",
        "service": "GenAI FullStack Backend",
        "version": "1.0"
    }

@app.get("/chat_stream/{message}")
async def chat_stream(message: str):
    """
    Main chat endpoint with AI-powered search.
    Orchestrates LLM reasoning + tool execution via LangGraph.
    """
    logger.info(f"Chat request received: {message[:50]}...")
    
    try:
        config = {
            "configurable": {
                "thread_id": 1
            }
        }

        sources = []
        final_answer_chunks = []

        async for event in graph.astream_events(
            {
                "messages": [HumanMessage(content=message)]
            },
            config=config,
            version="v2",
        ):
            # ----------------------------
            # Capture tool outputs (sources)
            # ----------------------------
            if event["event"] == "on_chain_stream":
                messages = event["data"]["chunk"].get("messages", [])

                for msg in messages:
                    # Tavily search output
                    if hasattr(msg, "name") and msg.name == "tavily_search_results_json":
                        try:
                            parsed = eval(msg.content)  # Safe here since Tavily returns structured dict
                            sources.extend(parsed)
                            logger.debug(f"Captured {len(parsed)} sources from Tavily")
                        except Exception as parse_error:
                            logger.warning(f"Failed to parse tool output: {parse_error}")

                    # Final LLM reasoning
                    elif hasattr(msg, "content") and msg.content:
                        final_answer_chunks.append(msg.content)

        logger.info(f"Chat response generated with {len(sources)} sources")
        return JSONResponse({
            "query": message,
            "sources": sources,
            "final_answer": " ".join(final_answer_chunks)
        })
    
    except Exception as chat_error:
        logger.error(f"Error processing chat request: {chat_error}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Failed to process chat request",
                "detail": str(chat_error)
            }
        )


if __name__ == "__main__":
    import uvicorn
    
    # Entry point: python app.py
    # Initializes database, CRUD, and chat services
    logger.info("Starting server via uvicorn...")
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )