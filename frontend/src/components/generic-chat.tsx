"use client";

import * as React from "react";
import type {
  AssistantResponse,
  ChatMessage,
  DocumentType,
  DocValues,
} from "@/lib/document-types";
import { mergeFields } from "@/lib/document-types";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] whitespace-pre-line rounded-lg bg-[#209dd7] px-3 py-2 text-sm text-white"
            : "max-w-[85%] whitespace-pre-line rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }
      >
        {message.content}
      </div>
    </div>
  );
}

export function GenericChat({
  doc,
  values,
  setValues,
  messages,
  setMessages,
}: {
  doc: DocumentType;
  values: DocValues;
  setValues: React.Dispatch<React.SetStateAction<DocValues>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  // Enhancement (PL-6): once the assistant has replied, return focus to the
  // input so the user can answer the next question without reaching for the mouse.
  React.useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          documentType: doc.id,
          fields: values,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as AssistantResponse;
      setValues((prev) => mergeFields(prev, data.fields));
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Sorry, something went wrong. Please try sending that again.");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <section
      aria-label="Chat"
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="text-sm font-semibold text-[#032147] dark:text-zinc-100">
        Chat with the assistant
      </h2>

      <div ref={scrollRef} className="flex h-80 flex-col gap-3 overflow-y-auto pr-1">
        {messages.map((message, i) => (
          <Bubble key={i} message={message} />
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-800">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          rows={2}
          disabled={busy}
          aria-label="Message"
        />
        <Button
          type="button"
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          className="bg-[#753991] text-white shadow hover:bg-[#5f2d74]"
        >
          Send
        </Button>
      </div>
    </section>
  );
}
