# Spectra — AI-Powered Conversational Intelligence Platform

Spectra is a **production-ready, full-stack AI application** that delivers real-time conversational intelligence with **source-attributed responses**.
It combines **FastAPI**, **LangGraph**, **OpenAI**, and **Tavily Search** to orchestrate multi-step reasoning, external retrieval, and response synthesis through a clean, scalable API.

The system is designed with a **backend-first architecture**, containerization, and frontend-ready endpoints for seamless integration with modern web applications.

---

## ✨ Key Features

* **Conversational AI Backend** built with FastAPI and asynchronous Python
* **LangGraph-based orchestration** for controlled tool invocation and reasoning flows
* **Source-aware responses**, returning both synthesized answers and underlying references
* **Streaming-ready APIs** for real-time chat experiences
* **Dockerized deployment** for portability and consistency
* **Frontend integration** using Next.js and Tailwind CSS

---

## 🧠 Architecture Overview

```
Next.js (Vercel)
      ↓
FastAPI Backend (Render)
      ↓
LangGraph Orchestration
      ↓
OpenAI + Tavily Search
```

---

## 🧱 Tech Stack

### Backend

* **FastAPI**
* **Python (async / asyncio)**
* **LangGraph**
* **LangChain**
* **OpenAI API**
* **Tavily Search**
* **Uvicorn**

### Frontend

* **Next.js**
* **Tailwind CSS**
* **IBM Plex Mono**

### Infrastructure

* **Docker**
* **Render (backend hosting)**
* **Vercel (frontend hosting)**

---


**Example Response**

```json
{
  "query": "What is Spectra?",
  "sources": [
    {
      "title": "Source Title",
      "url": "https://example.com",
      "score": 0.99
    }
  ],
  "answer": "Spectra is an AI-powered conversational intelligence platform..."
}
```

---

## 🛠️ Local Development

### 1️⃣ Clone the repository

```bash
git clone https://github.com/abhishrestha/spectra.git
cd spectra
```

---

### 2️⃣ Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:

```env
OPENAI_API_KEY=your_openai_key
TAVILY_API_KEY=your_tavily_key
```

Run the server:

```bash
uvicorn app:app --reload
```

Backend runs at:

```
http://localhost:8000
```

---

### 3️⃣ Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:3000
```

---

## 🐳 Docker (Backend)

### Build Image

```bash
docker build -t spectra-backend .
```

### Run Container

```bash
docker run -p 8000:8000 --env-file .env spectra-backend
```

---

