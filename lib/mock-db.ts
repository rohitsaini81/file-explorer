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
  },
];

