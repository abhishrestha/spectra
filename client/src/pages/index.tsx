import React, { useState, useRef, useEffect } from "react";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // Call backend endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat_stream/${encodeURIComponent(input)}`
      );

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }

      const data = await response.json();

      // Add AI response
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

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black p-4">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
          Spectra
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Multidimensional Intelligence
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-4">
        {messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg">Initiate a conversation</p>
              <p className="text-sm mt-2">
                Intelligence is just a message away
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
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={loading}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded font-semibold transition-colors"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
