"use client";

import { type ChangeEvent, useEffect, useState } from "react";

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
  sourceUrl?: string;
  localContent?: string;
};

type ApiResponse<T> = {
  data: T;
};

type FileContent = {
  id: string;
  name: string;
  content: string;
  sourceUrl: string | null;
};

export function FileManager() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string>("");
  const [openedFile, setOpenedFile] = useState<FileContent | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string>("");
  const [fileOpenError, setFileOpenError] = useState<string>("");
  const [createName, setCreateName] = useState("new-file.txt");
  const [createContent, setCreateContent] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [actionError, setActionError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadFiles = async (directoryId: string) => {
    if (!directoryId) {
      setFiles([]);
      setOpenedFile(null);
      return;
    }

    const response = await fetch(`/api/files?directoryId=${directoryId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch files");
    }

    const result = (await response.json()) as ApiResponse<FileItem[]>;
    setFiles(result.data);
  };

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
    const run = async () => {
      try {
        setFileOpenError("");
        setActionError("");
        await loadFiles(selectedDirectoryId);
        setOpenedFile(null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
      }
    };

    run();
  }, [selectedDirectoryId]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading file manager...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">Error: {error}</p>;
  }

  const openFile = async (fileId: string) => {
    try {
      setOpeningFileId(fileId);
      setFileOpenError("");
      const response = await fetch(`/api/file-content?fileId=${fileId}`);
      const result = (await response.json()) as ApiResponse<FileContent> & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to open file");
      }

      setOpenedFile(result.data);
    } catch (caughtError) {
      setFileOpenError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setOpeningFileId("");
    }
  };

  const createTextFile = async (name: string, content: string) => {
    if (!selectedDirectoryId) {
      throw new Error("Please select a directory first");
    }

    const response = await fetch("/api/files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        directoryId: selectedDirectoryId,
        name,
        content,
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? "Failed to create file");
    }

    await loadFiles(selectedDirectoryId);
  };

  const onCreateFile = async () => {
    try {
      setCreateLoading(true);
      setActionError("");
      await createTextFile(createName.trim(), createContent);
      setCreateContent("");
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setCreateLoading(false);
    }
  };

  const onUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const input = event.target;
      const pickedFile = input.files?.[0];
      if (!pickedFile) {
        return;
      }

      if (!pickedFile.name.toLowerCase().endsWith(".txt")) {
        throw new Error("Only .txt files are supported");
      }

      setUploadLoading(true);
      setActionError("");
      const content = await pickedFile.text();
      await createTextFile(pickedFile.name, content);
      input.value = "";
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="grid min-h-[620px] grid-cols-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-zinc-200 p-4 lg:border-r lg:border-b-0">
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

      <section className="space-y-4 p-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-3">
            <h3 className="mb-3 text-sm font-semibold text-zinc-800">Create Text File</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="my-notes.txt"
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              />
              <textarea
                value={createContent}
                onChange={(event) => setCreateContent(event.target.value)}
                placeholder="Write file content..."
                rows={5}
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              />
              <button
                type="button"
                onClick={onCreateFile}
                disabled={createLoading}
                className="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
              >
                {createLoading ? "Creating..." : "Create File"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-3">
            <h3 className="mb-3 text-sm font-semibold text-zinc-800">Upload Text File</h3>
            <label className="block rounded border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-600">
              <span className="block">Choose a `.txt` file to upload</span>
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={onUploadFile}
                disabled={uploadLoading}
                className="mt-3 block w-full text-xs text-zinc-600"
              />
            </label>
            {uploadLoading ? (
              <p className="mt-2 text-xs text-zinc-500">Uploading and saving file...</p>
            ) : null}
          </div>
        </div>

        {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-3">
            <h2 className="mb-3 text-sm font-semibold text-zinc-800">Files</h2>
            {files.length === 0 ? (
              <p className="text-sm text-zinc-500">No files in this directory.</p>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{file.name}</p>
                      <p className="text-xs text-zinc-500">{file.extension.toUpperCase()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-500">{file.size} B</p>
                      <button
                        type="button"
                        onClick={() => openFile(file.id)}
                        disabled={openingFileId === file.id}
                        className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                      >
                        {openingFileId === file.id ? "Opening..." : "Open"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <h3 className="mb-2 text-sm font-semibold text-zinc-800">Text File Viewer</h3>
            {fileOpenError ? (
              <p className="text-sm text-red-600">{fileOpenError}</p>
            ) : openedFile ? (
              <div className="space-y-2">
                <p className="text-xs text-zinc-600">
                  Opened: <span className="font-medium text-zinc-800">{openedFile.name}</span>
                </p>
                {openedFile.sourceUrl ? (
                  <a
                    href={openedFile.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs text-blue-700 underline"
                  >
                    {openedFile.sourceUrl}
                  </a>
                ) : null}
                <pre className="max-h-80 overflow-auto rounded border border-zinc-200 bg-white p-3 text-xs whitespace-pre-wrap text-zinc-900">
                  {openedFile.content}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Select a file and click Open.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
