# Spectra - Multidimensional Intelligence Chat Application

A full-stack GenAI application combining a React/TypeScript frontend with a FastAPI Python backend, providing intelligent chat with web search integration, persistent memory, and secure authentication.

## Features

### Frontend (React + TypeScript)
- **Google OAuth Authentication** - Seamless sign-in/sign-out via Supabase
- **Session Persistence** - Automatic session restoration from localStorage and backend
- **Chat Interface** - Real-time messaging with smooth scroll-to-bottom behavior
- **Structured Response Rendering** - Parses and formats AI responses with sections and bullet points
- **Source Attribution** - Displays web search sources with titles and URLs
- **Responsive Design** - Mobile-optimized UI with Tailwind CSS
- **Loading States** - Animated indicators for initialization and message streaming
- **Profile Management** - Dropdown menu with user info and sign-out

### Backend (FastAPI + Python)
- **LangGraph Orchestration** - Multi-turn AI conversation workflows with state management
- **PostgreSQL Persistence** - Stores users, chat sessions, and message history
- **Tavily Web Search** - Retrieval-augmented generation for current information
- **Memory Management** - Long-term conversation context and session replay
- **Streaming API** - Real-time response streaming with structured outputs
- **User Registration** - Automatic user creation and profile management

## Tech Stack

**Frontend:**
- React 18+, TypeScript
- Supabase (Authentication)
- Tailwind CSS
- localStorage (Session state)

**Backend:**
- FastAPI
- LangGraph
- PostgreSQL
- Tavily API
- Langchain

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- Python 3.9+
- PostgreSQL database
- Supabase project
- Tavily API key

### Installation

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd GenAI-FullStack-Application
   ```

2. **Setup Frontend**
   ```bash
   cd client
   npm install
   cp .env.example .env.local
   # Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   npm run dev
   ```

3. **Setup Backend**
   ```bash
   cd server
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Add DATABASE_URL, TAVILY_API_KEY, and other configs
   uvicorn main:app --reload
   ```

## Project Structure

```
GenAI-FullStack-Application/
├── client/                 # React TypeScript frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── lib/           # API calls, Supabase config
│   │   └── styles/        # CSS
│   └── package.json
├── server/                # FastAPI Python backend
│   ├── main.py            # FastAPI app entry
│   ├── routes/            # API endpoints
│   ├── models/            # SQLAlchemy models
│   ├── services/          # Business logic
│   └── requirements.txt
└── README.md
```

## API Endpoints

### Authentication & Users
- `POST /auth/register` - Register user with email
- `GET /users/{email}/sessions` - Fetch user's chat sessions

### Chat Sessions
- `POST /chat/sessions` - Create new chat session
- `GET /chat/sessions/{session_id}` - Get session details
- `POST /chat/sessions/{session_id}/messages` - Store message

### Messages
- `GET /chat/sessions/{session_id}/messages` - Fetch message history
- `POST /chat/messages` - Send message and get AI response (streaming)

## Environment Variables

**Frontend (.env.local):**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:8000
```

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@localhost/dbname
TAVILY_API_KEY=your_tavily_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_key
```

## Usage

1. Navigate to frontend (default: http://localhost:5173)
2. Click "Add account with Google" to authenticate
3. Type a message and click "Send"
4. Receive AI responses with web search sources
5. Session history persists across browser refreshes
6. Sign out via profile dropdown

## Key Features Explained

**Session Restoration:** When a user signs in, the app checks localStorage for a stored session ID. If valid, it loads the previous conversation; otherwise, it uses the most recent session or creates a new one.

**Sources Attribution:** Web search results from Tavily are parsed and displayed as clickable source cards below AI responses, providing transparency and traceability.

**Message Persistence:** User and assistant messages are stored in PostgreSQL, enabling conversation history replay and long-term memory across sessions.

**Structured Responses:** AI outputs are parsed into formatted sections with headers and bullet points, improving readability and information hierarchy.

## ATS Optimization Keywords

`React`, `TypeScript`, `FastAPI`, `Python`, `PostgreSQL`, `LangGraph`, `Tavily`, `Supabase`, `OAuth`, `Session Management`, `API Integration`, `REST`, `Real-time Streaming`, `Full-Stack Development`, `RAG`, `Web Search`, `Persistent Memory`, `Authentication`, `Responsive UI`

---
