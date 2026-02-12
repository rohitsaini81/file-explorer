export type DirectoryRecord = {
  id: string;
  name: string;
  parentId: string | null;
};

export type FileRecord = {
  id: string;
  name: string;
  directoryId: string;
  size: number;
  extension: string;
  updatedAt: string;
  sourceUrl?: string;
  localContent?: string;
};

// Temporary in-memory arrays acting like database tables.
export const directoriesTable: DirectoryRecord[] = [
  {
    id: "root",
    name: "root",
    parentId: null,
  },
  {
    id: "test",
    name: "test",
    parentId: "root",
  },
];

// Temporary in-memory file records.
export const filesTable: FileRecord[] = [
  {
    id: "file-1",
    name: "test.txt",
    directoryId: "test",
    size: 48,
    extension: "txt",
    updatedAt: "2026-02-12T00:00:00.000Z",
    localContent:
      "This is test.txt from temporary in-memory backend data in Next.js API.",
  },
  {
    id: "file-2",
    name: "simple.txt",
    directoryId: "test",
    size: 1200,
    extension: "txt",
    updatedAt: "2026-02-12T00:00:00.000Z",
    sourceUrl: "https://sample-files.com/downloads/documents/txt/simple.txt",
  },
  {
    id: "file-3",
    name: "long-doc.txt",
    directoryId: "test",
    size: 4200,
    extension: "txt",
    updatedAt: "2026-02-12T00:00:00.000Z",
    sourceUrl: "https://sample-files.com/downloads/documents/txt/long-doc.txt",
  },
  {
    id: "file-4",
    name: "ascii-art.txt",
    directoryId: "test",
    size: 900,
    extension: "txt",
    updatedAt: "2026-02-12T00:00:00.000Z",
    sourceUrl: "https://sample-files.com/downloads/documents/txt/ascii-art.txt",
  },
  {
    id: "file-5",
    name: "data.txt",
    directoryId: "test",
    size: 1800,
    extension: "txt",
    updatedAt: "2026-02-12T00:00:00.000Z",
    sourceUrl: "https://sample-files.com/downloads/documents/txt/data.txt",
  },
  {
    id: "file-6",
    name: "multilang.txt",
    directoryId: "test",
    size: 1600,
    extension: "txt",
    updatedAt: "2026-02-12T00:00:00.000Z",
    sourceUrl: "https://sample-files.com/downloads/documents/txt/multilang.txt",
  },
];
