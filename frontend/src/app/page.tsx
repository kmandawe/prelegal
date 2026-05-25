import { AppGate } from "@/components/app-gate";
import { DocumentAssistant } from "@/components/document-assistant";

export default function Home() {
  return (
    <AppGate>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Prelegal Document Creator
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Chat with the assistant to choose a Common Paper agreement, fill in
            its details, then download it as a PDF.
          </p>
        </header>
        <DocumentAssistant />
      </main>
    </AppGate>
  );
}
