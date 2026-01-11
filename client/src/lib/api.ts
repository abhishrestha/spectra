

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatResponse {
  query: string;
  sources: Array<{
    title?: string;
    url?: string;
    score?: number;
  }>;
  final_answer: string;
}

// --------------------------------
// Error Handling
// --------------------------------
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      `API Error: ${response.statusText} - ${errorText}`
    );
  }
  return response.json();
}

// --------------------------------
// User Management
// --------------------------------
export async function registerUser(
  email: string,
  name: string = "User"
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, name }),
  });
  return handleResponse<User>(response);
}


// Chat Session Management
export async function getUserSessions(userEmail: string): Promise<{
  sessions: ChatSession[];
  user_id: string;
}> {
  const response = await fetch(
    `${API_BASE_URL}/chat/sessions/${encodeURIComponent(userEmail)}`
  );
  return handleResponse<{ sessions: ChatSession[]; user_id: string }>(response);
}

export async function createChatSession(
  userEmail: string,
  title: string = "New Chat"
): Promise<{ user: User; session: ChatSession }> {
  const response = await fetch(`${API_BASE_URL}/chat/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_email: userEmail, title }),
  });
  return handleResponse<{ user: User; session: ChatSession }>(response);
}


// Message Operations

export async function storeMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<{ success: boolean; session_id: string; role: string }> {
  const response = await fetch(`${API_BASE_URL}/messages/store`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId, role, content }),
  });
  return handleResponse(response);
}

export async function fetchMessages(sessionId: string): Promise<{
  session_id: string;
  message_count: number;
  messages: Message[];
}> {
  const response = await fetch(`${API_BASE_URL}/messages/${sessionId}`);
  return handleResponse(response);
}


// AI Chat

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const response = await fetch(
    `${API_BASE_URL}/chat_stream/${encodeURIComponent(message)}`
  );
  return handleResponse<ChatResponse>(response);
}


// Local Storage Helpers

const SESSION_KEY = "current_session_id";
const USER_KEY = "current_user";

export function saveCurrentSession(sessionId: string): void {
  localStorage.setItem(SESSION_KEY, sessionId);
}

export function getCurrentSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function clearCurrentSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function saveCurrentUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
}

export function clearCurrentUser(): void {
  localStorage.removeItem(USER_KEY);
}
