from typing import TypedDict, Annotated, Union, List, AsyncGenerator
from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio
import warnings

from langgraph.graph import add_messages, StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, ToolMessage

# --------------------------------
# Load environment variables
# --------------------------------
load_dotenv()

# Suppress Tavily deprecation warning while using the community fallback
warnings.filterwarnings(
    "ignore",
    message=".*TavilySearchResults.*deprecated.*langchain-tavily.*",
    category=DeprecationWarning,
)

# --------------------------------
# FastAPI app
# --------------------------------
app = FastAPI(title="AI Search API", version="1.0")

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
        "https://spectra-six-jet.vercel.app/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"status": "Server running"}

@app.get("/chat_stream/{message}")
async def chat_stream(message: str):

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
                    except Exception:
                        pass

                # Final LLM reasoning
                elif hasattr(msg, "content") and msg.content:
                    final_answer_chunks.append(msg.content)

    return JSONResponse({
        "query": message,
        "sources": sources,
        "final_answer": " ".join(final_answer_chunks)
    })


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )