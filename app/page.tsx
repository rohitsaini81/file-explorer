import { FileManager } from "./components/file-manager";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <main className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">File Manager</h1>
        <p className="mb-6 text-sm text-zinc-600">
          Data is loaded from Next.js API routes backed by temporary in-memory arrays.
        </p>
        <FileManager />
      </main>
    </div>
  );
}
