"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { postData } from "@/lib/api";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hello! I'm your Solar AI Assistant. How can I help you today?",
      translatedText: null,
      showTranslated: false,
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages change or panel opens
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
      translatedText: null,
      showTranslated: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputText.trim();
    setInputText("");
    setLoading(true);

    try {
      const response = await postData("/chatbot/chat/", { message: messageToSend });
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: response.reply || "Sorry, I couldn't understand that. Could you please rephrase?",
          translatedText: null,
          showTranslated: false,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Oops! My solar panels are a bit clouded right now. Please try again later.",
          translatedText: null,
          showTranslated: false,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (messageId, text) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    const msg = messages[idx];

    if (msg.translatedText) {
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, showTranslated: !m.showTranslated } : m))
      );
      return;
    }

    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=hi&dt=t&q=${encodeURIComponent(text)}`
      );
      const data = await res.json();
      const translated = data[0].map((item) => item[0]).join("");
      setMessages((prev) =>
        prev.map((m, i) =>
          i === idx ? { ...m, translatedText: translated, showTranslated: true } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === idx
            ? { ...m, translatedText: "(Hindi Translation Unavailable)", showTranslated: true }
            : m
        )
      );
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <style>{`.chat-messages::-webkit-scrollbar{display:none}`}</style>
      {/* Floating panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ maxHeight: "70vh" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
            <div className="w-9 h-9 rounded-full bg-[#E97451] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Solar AI</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-slate-500">Always online</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {messages.map((msg) => {
              const isBot = msg.sender === "bot";
              return (
                <div key={msg.id} className={`flex gap-2 ${isBot ? "justify-start" : "justify-end"}`}>
                  {isBot && (
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0 self-end mb-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E97451" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                  )}
                  <div style={{ maxWidth: "80%" }}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug ${
                      isBot
                        ? "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                        : "bg-[#E97451] text-white rounded-br-sm"
                    }`}>
                      {msg.showTranslated ? msg.translatedText : msg.text}
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 ${isBot ? "justify-start" : "justify-end"}`}>
                      <span className="text-[10px] text-slate-400">
                        {format(msg.timestamp, "hh:mm a")}
                      </span>
                      {isBot && (
                        <button
                          onClick={() => handleTranslate(msg.id, msg.text)}
                          className="text-[10px] flex items-center gap-0.5 hover:text-[#E97451] transition"
                          style={{ color: msg.showTranslated ? "#E97451" : "#9CA3AF" }}
                          title="Translate to Hindi"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
                          </svg>
                          {msg.showTranslated ? "Original" : "हिंदी"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0 self-end">
                  <div className="w-3 h-3 border-2 border-[#E97451] border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your energy…"
              disabled={loading}
              className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-orange-300 transition disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || loading}
              className="w-9 h-9 rounded-full flex items-center justify-center transition shrink-0"
              style={{
                backgroundColor: !inputText.trim() || loading ? "#F3F4F6" : "#E97451",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={!inputText.trim() || loading ? "#9CA3AF" : "white"}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: "translateX(1px)" }}>
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* FAB toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#E97451] shadow-lg flex items-center justify-center transition hover:scale-105 active:scale-95"
        aria-label={open ? "Close chat" : "Open Solar AI chat"}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {/* Unread pulse — shown only when closed and there's more than the welcome message */}
        {!open && messages.length > 1 && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}
