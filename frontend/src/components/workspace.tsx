"use client";

import * as React from "react";
import { getDocument, signout, type DocumentMeta } from "@/lib/api";
import type { DocumentType } from "@/lib/document-types";
import { fetchDocumentTypes } from "@/lib/document-types";
import { LEGAL_DISCLAIMER } from "@/lib/legal";
import { clearSession, type Session } from "@/lib/session";
import { DocumentAssistant } from "./document-assistant";
import { DocumentCreator } from "./document-creator";
import { DocumentsHistory } from "./documents-history";
import { MndaCreator } from "./mnda-creator";
import { Button } from "./ui/button";

type View =
  | { kind: "create" }
  | { kind: "history" }
  | {
      kind: "editor";
      doc: DocumentType;
      initialFields?: Record<string, unknown>;
      savedId?: number;
    };

/**
 * Authenticated app shell (PL-7): branded nav, Create / My Documents views, and
 * a persistent legal-review disclaimer in the footer.
 */
export function Workspace({ session }: { session: Session }) {
  const [docs, setDocs] = React.useState<DocumentType[] | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [view, setView] = React.useState<View>({ kind: "create" });
  const [openError, setOpenError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchDocumentTypes()
      .then(setDocs)
      .catch(() => setLoadError(true));
  }, []);

  async function handleSignOut() {
    await signout();
    clearSession();
  }

  async function openSaved(meta: DocumentMeta) {
    if (!docs) return;
    const doc = docs.find((d) => d.id === meta.doc_type);
    if (!doc) {
      setOpenError("That document type is no longer available.");
      return;
    }
    try {
      const full = await getDocument(meta.id);
      setOpenError(null);
      setView({ kind: "editor", doc, initialFields: full.fields, savedId: full.id });
    } catch {
      setOpenError("Could not open that document. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <TopNav
        session={session}
        view={view}
        onNavigate={(kind) => {
          setOpenError(null);
          setView({ kind });
        }}
        onSignOut={() => void handleSignOut()}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {openError && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {openError}
          </p>
        )}

        {view.kind === "create" && (
          <CreateView
            docs={docs}
            loadError={loadError}
            onSelect={(doc) => setView({ kind: "editor", doc })}
          />
        )}

        {view.kind === "history" && (
          <DocumentsHistory docs={docs} onOpen={(meta) => void openSaved(meta)} />
        )}

        {view.kind === "editor" && (
          <Editor view={view} onBack={() => setView({ kind: "create" })} />
        )}
      </main>

      <Footer />
    </div>
  );
}

function CreateView({
  docs,
  loadError,
  onSelect,
}: {
  docs: DocumentType[] | null;
  loadError: boolean;
  onSelect: (doc: DocumentType) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#032147] dark:text-zinc-50">
          Create a document
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Chat with the assistant to choose a Common Paper agreement, fill in its
          details, then save and download it.
        </p>
      </header>

      {loadError ? (
        <p className="text-sm text-red-600" role="alert">
          Could not load the document catalog. Please refresh the page.
        </p>
      ) : !docs ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading documents...</p>
      ) : (
        <DocumentAssistant docs={docs} onSelect={onSelect} />
      )}
    </div>
  );
}

function Editor({
  view,
  onBack,
}: {
  view: Extract<View, { kind: "editor" }>;
  onBack: () => void;
}) {
  const { doc, initialFields, savedId } = view;
  // Key by document + saved id so opening a different saved document remounts
  // the creator and re-seeds its form/state instead of reusing the old values.
  const editorKey = `${doc.id}:${savedId ?? "new"}`;
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-[#209dd7] hover:underline"
      >
        ← Choose a different document
      </button>
      <div>
        <h2 className="text-lg font-bold text-[#032147] dark:text-zinc-50">
          {doc.name}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{doc.description}</p>
      </div>
      {doc.engine === "mnda" ? (
        <MndaCreator key={editorKey} initialFields={initialFields} savedId={savedId} />
      ) : (
        <DocumentCreator
          key={editorKey}
          doc={doc}
          initialFields={initialFields}
          savedId={savedId}
        />
      )}
    </div>
  );
}

function TopNav({
  session,
  view,
  onNavigate,
  onSignOut,
}: {
  session: Session;
  view: View;
  onNavigate: (kind: "create" | "history") => void;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <span className="rounded-md bg-[#032147] px-2.5 py-1 text-sm font-bold tracking-tight text-white">
            Prelegal
          </span>
          <nav className="flex items-center gap-1">
            <NavButton
              active={view.kind === "create" || view.kind === "editor"}
              onClick={() => onNavigate("create")}
            >
              Create
            </NavButton>
            <NavButton active={view.kind === "history"} onClick={() => onNavigate("history")}>
              My Documents
            </NavButton>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#888888] sm:inline">
            {session.name || session.email}
          </span>
          <Button type="button" variant="outline" className="h-8" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-[#209dd7]/10 px-3 py-1.5 text-sm font-semibold text-[#209dd7]"
          : "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }
    >
      {children}
    </button>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-xs leading-5 text-[#888888]">{LEGAL_DISCLAIMER}</p>
        <p className="mt-2 text-xs text-zinc-400">
          Templates based on Common Paper standards (CC BY 4.0).
        </p>
      </div>
    </footer>
  );
}
