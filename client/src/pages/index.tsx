import React, { useState, useRef, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import {
  registerUser,
  createChatSession,
  storeMessage,
  fetchMessages,
  sendChatMessage,
  getUserSessions,
  saveCurrentSession,
  getCurrentSession,
  clearCurrentSession,
  type User,
  type ChatSession as BackendChatSession,
  type Message as BackendMessage,
} from "../lib/api";

interface Source {
  title?: string;
  url?: string;
  score?: number;
}

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  sources?: Source[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chatSession, setChatSession] = useState<BackendChatSession | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize user and load chat session when authenticated
  useEffect(() => {
    async function initializeUserAndChat() {
      if (!session?.user?.email) {
        setInitLoading(false);
        return;
      }

      try {
        setInitLoading(true);
        setError(null);
        
        // Step 1: Register/get user from backend
        const user = await registerUser(
          session.user.email,
          session.user.user_metadata?.full_name || session.user.email.split("@")[0]
        );
        setCurrentUser(user);
        console.log("✓ User initialized:", user);

        // Step 2: Check if user has existing chat sessions
        const { sessions } = await getUserSessions(session.user.email);
        console.log(`Found ${sessions.length} existing sessions`);

        // Step 3: Determine which session to use
        let activeSession: BackendChatSession | null = null;
        let shouldLoadMessages = false;

        // Try to get session from localStorage first
        const storedSessionId = getCurrentSession();
        
        if (storedSessionId && sessions.length > 0) {
          // Check if stored session exists in user's sessions
          activeSession = sessions.find((s) => s.id === storedSessionId) || null;
          if (activeSession) {
            console.log("✓ Restored session from localStorage:", storedSessionId);
            shouldLoadMessages = true;
          } else {
            console.log("⚠ Stored session not found, will use most recent");
            clearCurrentSession(); // Clear invalid session
          }
        }

        // If no valid stored session, use most recent or create new
        if (!activeSession) {
          if (sessions.length > 0) {
            // Use most recent session
            activeSession = sessions[0];
            saveCurrentSession(activeSession.id);
            console.log("✓ Using most recent session:", activeSession.id);
            shouldLoadMessages = true;
          } else {
            // No sessions exist - create new one
            console.log("→ No existing sessions, creating new one...");
            const { session: newSession } = await createChatSession(
              session.user.email,
              "New Conversation"
            );
            activeSession = newSession;
            saveCurrentSession(newSession.id);
            console.log("✓ New chat session created:", newSession.id);
            shouldLoadMessages = false; // New session has no messages
          }
        }

        setChatSession(activeSession);

        // Step 4: Load messages if we're using an existing session
        if (shouldLoadMessages) {
          try {
            const { messages: backendMessages } = await fetchMessages(activeSession.id);
            
            // Convert backend messages to UI format
            const uiMessages: Message[] = backendMessages.map((msg: BackendMessage) => ({
              id: msg.id,
              type: msg.role === "user" ? "user" : "ai",
              content: msg.content,
            }));
            
            setMessages(uiMessages);
            console.log(`✓ Loaded ${backendMessages.length} messages`);
          } catch (msgErr) {
            console.error("Failed to load messages:", msgErr);
            // Don't fail initialization if messages fail to load
            setError("Failed to load message history");
          }
        } else {
          console.log("✓ Starting with empty message history");
          setMessages([]);
        }

      } catch (err) {
        console.error("Failed to initialize user/chat:", err);
        setError(err instanceof Error ? err.message : "Initialization failed. Please try refreshing.");
        // Clear potentially corrupted state
        clearCurrentSession();
        setChatSession(null);
        setMessages([]);
      } finally {
        setInitLoading(false);
      }
    }

    initializeUserAndChat();
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (sessionError) {
        setAuthError(sessionError.message);
        return;
      }

      setSession(data.session ?? null);
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setAuthError(null);
        
        // Clear session when user signs out
        if (!newSession) {
          clearCurrentSession();
          setCurrentUser(null);
          setChatSession(null);
          setMessages([]);
          setProfileOpen(false);
        }
      }
    );

    loadSession();

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const redirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (signInError) {
        setAuthError(signInError.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setAuthError(signOutError.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-out failed";
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Require authentication
    if (!session?.user?.email) {
      setError("Please sign in to chat");
      return;
    }

    // Ensure we have a chat session
    if (!chatSession) {
      setError("Chat session not initialized. Please refresh the page.");
      return;
    }

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const userQuery = input;
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // Step 1: Store user message in backend
      await storeMessage(chatSession.id, "user", userQuery);

      // Step 2: Call AI chat endpoint
      const data = await sendChatMessage(userQuery);

      // Step 3: Store AI response in backend
      await storeMessage(chatSession.id, "assistant", data.final_answer);

      // Step 4: Add AI response to UI
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.final_answer || "No response generated",
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch response";
      setError(errorMessage);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const resolvedName = (
    currentUser?.name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split("@")[0] ||
    ""
  ).trim();
  const firstName = resolvedName ? resolvedName.split(/\s+/)[0] : "there";
  const avatarLetter = firstName ? firstName.charAt(0).toUpperCase() : "?";
  const profileImage =
    session?.user?.user_metadata?.picture ||
    session?.user?.user_metadata?.avatar_url ||
    "";

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Spectra
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Multidimensional Intelligence
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {session ? (
              <div className="relative flex items-center gap-3" ref={profileRef}>
                <span className="text-sm md:text-base font-semibold text-gray-100">
                  Hi, {firstName}
                </span>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="h-10 w-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-blue-100 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black transition-colors overflow-hidden"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={`Profile of ${firstName}`}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    avatarLetter
                  )}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-12 w-56 rounded-lg border border-gray-800 bg-gray-900/95 shadow-xl backdrop-blur z-20">
                    <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-bold text-blue-100 overflow-hidden">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt={`Profile of ${firstName}`}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          avatarLetter
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm text-gray-100 font-semibold truncate">{resolvedName || "Signed in"}</p>
                        <p className="text-xs text-gray-500 truncate">Google account</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-red-200 hover:text-red-100 hover:bg-red-900/40 border-t border-gray-800"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="whitespace-nowrap rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs md:text-sm font-semibold text-white transition-colors hover:border-blue-500 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authLoading ? "Connecting..." : "Add account with Google"}
              </button>
            )}
          </div>
        </div>
        {authError && (
          <p className="text-xs text-red-400 mt-2">{authError}</p>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-4">
        {initLoading && session && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="flex gap-2 justify-center mb-3">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                <span
                  className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></span>
                <span
                  className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></span>
              </div>
              <p className="text-sm">Initializing your chat session...</p>
            </div>
          </div>
        )}

        {!initLoading && messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg">
                {session ? "Initiate a conversation" : "Sign in to start chatting"}
              </p>
              <p className="text-sm mt-2">
                {session
                  ? "Intelligence is just a message away"
                  : "Add your Google account to begin"}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center mb-4">
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {/* Message Bubble */}
            <div
              className={`message-container ${
                message.type === "user" ? "user-message" : "ai-message"
              }`}
            >
              <div
                className={`message-bubble ${
                  message.type === "user" ? "user-bubble" : "ai-bubble"
                }`}
              >
                {message.content}
              </div>
            </div>

            {/* Sources */}
            {message.type === "ai" && message.sources && message.sources.length > 0 && (
              <div className="ml-0 mt-3 mb-6">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 font-semibold">
                  Sources
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 max-w-3xl">
                  {message.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-900/70 border border-gray-800 rounded-md px-3 py-2 shadow-sm hover:border-gray-700 transition-colors text-xs"
                    >
                      {source.title && (
                        <p className="text-gray-200 mb-1 font-semibold leading-snug line-clamp-2">
                          {source.title}
                        </p>
                      )}
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link text-[11px] text-blue-300 hover:text-blue-200 break-all"
                        >
                          {source.url}
                        </a>
                      )}
                      
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="message-container ai-message">
            <div className="message-bubble ai-bubble">
              <div className="flex gap-2">
                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span
                  className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></span>
                <span
                  className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 bg-black p-4 md:p-6">
        {!session && (
          <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm py-2">
            Sign in with Google to start chatting
          </div>
        )}
        {session && (
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={loading || initLoading}
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || initLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded font-semibold transition-colors"
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
