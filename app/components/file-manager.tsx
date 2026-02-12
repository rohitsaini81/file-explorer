"use client";

import { useEffect, useState } from "react";

type Directory = {
  id: string;
  name: string;
  parentId: string | null;
};

type FileItem = {
  id: string;
  name: string;
  directoryId: string;
  size: number;
  extension: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  data: T;
};

export function FileManager() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadDirectories = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/directories");
        if (!response.ok) {
          throw new Error("Failed to fetch directories");
        }

        const result = (await response.json()) as ApiResponse<Directory[]>;
        setDirectories(result.data);

        const testDirectory = result.data.find((directory) => directory.name === "test");
        const fallbackDirectory = result.data[0];
        setSelectedDirectoryId(testDirectory?.id ?? fallbackDirectory?.id ?? "");
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadDirectories();
  }, []);

  useEffect(() => {
    const loadFiles = async () => {
      if (!selectedDirectoryId) {
        setFiles([]);
        return;
      }

      try {
        const response = await fetch(`/api/files?directoryId=${selectedDirectoryId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch files");
        }

        const result = (await response.json()) as ApiResponse<FileItem[]>;
        setFiles(result.data);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
      }
    };

    loadFiles();
  }, [selectedDirectoryId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading file manager...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">Error: {error}</p>;
  }

  return (
    <div className="grid min-h-[500px] grid-cols-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:grid-cols-[250px_1fr]">
      <aside className="border-b border-zinc-200 p-4 md:border-r md:border-b-0">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">Directories</h2>
        <ul className="space-y-2">
          {directories.map((directory) => {
            const isActive = selectedDirectoryId === directory.id;

            return (
              <li key={directory.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDirectoryId(directory.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {directory.name}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800">Files</h2>
        {files.length === 0 ? (
          <p className="text-sm text-zinc-500">No files in this directory.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{file.name}</p>
                  <p className="text-xs text-zinc-500">{file.extension.toUpperCase()}</p>
                </div>
                <p className="text-xs text-zinc-500">{file.size} B</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

