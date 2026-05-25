"use client";

import * as React from "react";
import type {
  AssistantResponse,
  ChatMessage,
  DocumentType,
} from "@/lib/document-types";
import { fetchDocumentTypes } from "@/lib/document-types";
import { MndaCreator } from "./mnda-creator";
import { DocumentCreator } from "./document-creator";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you create a legal document. Tell me what you need - for " +
    "example \"an NDA with a vendor\" or \"a cloud service agreement for our " +
    "SaaS\" - or pick one from the list below.",
};

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

function Triage({
  docs,
  onSelect,
}: {
  docs: DocumentType[];
  onSelect: (doc: DocumentType) => void;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  // Enhancement (PL-6): return focus to the input after each reply.
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
        body: JSON.stringify({ messages: next, documentType: null, fields: {} }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as AssistantResponse;
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.documentType) {
        const match = docs.find((d) => d.id === data.documentType);
        if (match) onSelect(match);
      }
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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section
        aria-label="Chat"
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-sm font-semibold text-[#032147] dark:text-zinc-100">
          What would you like to create?
        </h2>
        <div
          ref={scrollRef}
          className="flex h-80 flex-col gap-3 overflow-y-auto pr-1"
        >
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
            placeholder="Describe the document you need..."
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

      <section aria-label="Document types" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#032147] dark:text-zinc-100">
          Or choose a document
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {docs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => onSelect(doc)}
              className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#209dd7] hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <span className="text-sm font-semibold text-[#032147] dark:text-zinc-100">
                {doc.short_name}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {doc.description}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function DocumentAssistant() {
  const [docs, setDocs] = React.useState<DocumentType[] | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [selected, setSelected] = React.useState<DocumentType | null>(null);

  React.useEffect(() => {
    fetchDocumentTypes()
      .then(setDocs)
      .catch(() => setLoadError(true));
  }, []);

  if (selected) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="self-start text-sm text-[#209dd7] hover:underline"
        >
          ← Choose a different document
        </button>
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {selected.name}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {selected.description}
          </p>
        </div>
        {selected.engine === "mnda" ? (
          <MndaCreator />
        ) : (
          <DocumentCreator doc={selected} />
        )}
      </div>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Could not load the document catalog. Please refresh the page.
      </p>
    );
  }

  if (!docs) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Loading documents...
      </p>
    );
  }

  return <Triage docs={docs} onSelect={setSelected} />;
}
