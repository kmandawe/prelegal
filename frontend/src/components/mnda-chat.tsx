"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import type { MndaFormValues } from "@/lib/schema";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

type PartyFields = {
  printName: string | null;
  title: string | null;
  company: string | null;
  noticeAddress: string | null;
};

type ChatFields = {
  purpose: string | null;
  effectiveDate: string | null;
  mndaTermKind: "years" | "untilTerminated" | null;
  mndaTermYears: number | null;
  termOfConfidentialityKind: "years" | "perpetuity" | null;
  termOfConfidentialityYears: number | null;
  governingLawState: string | null;
  jurisdiction: string | null;
  modifications: string | null;
  party1: PartyFields;
  party2: PartyFields;
};

type ChatResponse = { reply: string; fields: ChatFields };

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you put together a Mutual NDA. Tell me what you need - for " +
    "example, who the two parties are and why you're sharing confidential " +
    "information.",
};

/**
 * Applies the model's extracted fields onto the shared form. Only non-null
 * values are written, so a field the model doesn't yet know never clears one
 * the user already has. The live preview reacts to these updates automatically.
 */
function applyFields(
  fields: ChatFields,
  setValue: ReturnType<typeof useFormContext<MndaFormValues>>["setValue"],
) {
  const set = (name: FieldPath<MndaFormValues>, value: unknown) => {
    if (value !== null && value !== undefined) {
      setValue(name, value as never, { shouldValidate: true, shouldDirty: true });
    }
  };

  set("purpose", fields.purpose);
  set("effectiveDate", fields.effectiveDate);
  set("mndaTermKind", fields.mndaTermKind);
  set("mndaTermYears", fields.mndaTermYears);
  set("termOfConfidentialityKind", fields.termOfConfidentialityKind);
  set("termOfConfidentialityYears", fields.termOfConfidentialityYears);
  set("governingLawState", fields.governingLawState);
  set("jurisdiction", fields.jurisdiction);
  set("modifications", fields.modifications);

  for (const p of ["party1", "party2"] as const) {
    set(`${p}.printName`, fields[p]?.printName);
    set(`${p}.title`, fields[p]?.title);
    set(`${p}.company`, fields[p]?.company);
    set(`${p}.noticeAddress`, fields[p]?.noticeAddress);
  }
}

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

export function MndaChat() {
  const { setValue, getValues } = useFormContext<MndaFormValues>();
  const [messages, setMessages] = React.useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, fields: getValues() }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = (await res.json()) as ChatResponse;
      applyFields(data.fields, setValue);
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
