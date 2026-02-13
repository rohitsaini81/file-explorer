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
  storageKey: string;
  directoryId: string;
  size: number;
  extension: string;
  mimeType: string;
  updatedAt: string;
  sourceUrl?: string;
  localContent?: string;
  dataUrl?: string;
};

type ApiResponse<T> = {
  data: T;
};

type FileContent = {
  id: string;
  name: string;
  mimeType: string;
  content: string | null;
  dataUrl: string | null;
  sourceUrl: string | null;
};

export function FileManager() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string>("");
  const [openedFile, setOpenedFile] = useState<FileContent | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string>("");
  const [fileOpenError, setFileOpenError] = useState<string>("");
  const [createName, setCreateName] = useState("My custom file title");
  const [createContent, setCreateContent] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [actionError, setActionError] = useState<string>("");
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
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

        const rootDirectory = result.data.find(
          (directory) => directory.parentId === null && directory.name.toLowerCase() === "root"
        );
        const testDirectory = result.data.find((directory) => directory.name === "test");
        const fallbackDirectory = result.data[0];
        setSelectedDirectoryId(rootDirectory?.id ?? testDirectory?.id ?? fallbackDirectory?.id ?? "");
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
        title: name,
        content,
        mimeType: "text/plain",
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
      setIsAddFileModalOpen(false);
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

      setUploadLoading(true);
      setActionError("");
      const fileAsDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Unable to read selected file"));
        reader.readAsDataURL(pickedFile);
      });

      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          directoryId: selectedDirectoryId,
          title: pickedFile.name,
          mimeType: pickedFile.type || "application/octet-stream",
          dataUrl: fileAsDataUrl,
          size: pickedFile.size,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to upload file");
      }

      await loadFiles(selectedDirectoryId);
      input.value = "";
      setIsAddFileModalOpen(false);
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
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm text-zinc-600">Create or upload any file type to selected directory.</p>
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setIsAddFileModalOpen(true);
            }}
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            Add File
          </button>
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
                      <p className="text-xs text-zinc-500">{file.mimeType}</p>
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
            <h3 className="mb-2 text-sm font-semibold text-zinc-800">File Viewer</h3>
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
                {openedFile.content ? (
                  <pre className="max-h-80 overflow-auto rounded border border-zinc-200 bg-white p-3 text-xs whitespace-pre-wrap text-zinc-900">
                    {openedFile.content}
                  </pre>
                ) : null}
                {openedFile.dataUrl && openedFile.mimeType.startsWith("image/") ? (
                  <img
                    src={openedFile.dataUrl}
                    alt={openedFile.name}
                    className="max-h-80 w-full rounded border border-zinc-200 object-contain"
                  />
                ) : null}
                {openedFile.dataUrl && openedFile.mimeType.startsWith("audio/") ? (
                  <audio controls src={openedFile.dataUrl} className="w-full" />
                ) : null}
                {openedFile.dataUrl && openedFile.mimeType.startsWith("video/") ? (
                  <video
                    controls
                    src={openedFile.dataUrl}
                    className="max-h-80 w-full rounded border border-zinc-200"
                  />
                ) : null}
                {openedFile.dataUrl &&
                !openedFile.mimeType.startsWith("image/") &&
                !openedFile.mimeType.startsWith("audio/") &&
                !openedFile.mimeType.startsWith("video/") ? (
                  <a
                    href={openedFile.dataUrl}
                    download={openedFile.name}
                    className="inline-block rounded bg-zinc-900 px-3 py-2 text-xs font-medium text-white"
                  >
                    Download File
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Select a file and click Open.</p>
            )}
          </div>
        </div>
      </section>

      {isAddFileModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-[50vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-900">Add File</h3>
              <button
                type="button"
                onClick={() => setIsAddFileModalOpen(false)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
              >
                Close
              </button>
            </div>

            <div className="grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 p-3">
                <h4 className="mb-3 text-sm font-semibold text-zinc-800">Create File</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Visible file title"
                    className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  />
                  <textarea
                    value={createContent}
                    onChange={(event) => setCreateContent(event.target.value)}
                    placeholder="Write file content..."
                    rows={6}
                    className="w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={onCreateFile}
                    disabled={createLoading}
                    className="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {createLoading ? "Creating..." : "Create File"}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 p-3">
                <h4 className="mb-3 text-sm font-semibold text-zinc-800">Upload File</h4>
                <label className="block rounded border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-600">
                  <span className="block">Choose any file to upload</span>
                  <input
                    type="file"
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
