import { NextRequest } from "next/server";
import { GET as getDirectories } from "../app/api/directories/route";
import { GET as getFiles, POST as postFiles } from "../app/api/files/route";
import { GET as getFileContent } from "../app/api/file-content/route";
import { upload_file_to_cloud, delete_file_from_cloud } from "../cloud";

async function logResponse(label: string, response: Response) {
  const payload = await response.json();
  console.log(`\n${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

async function testBackend() {
  console.log("=== Backend API tests ===");

  const dirsRes = await getDirectories();
  await logResponse("GET /api/directories", dirsRes);

  const filesReq = makeRequest(
    "http://localhost/api/files?directoryId=test"
  );
  const filesRes = await getFiles(filesReq);
  await logResponse("GET /api/files?directoryId=test", filesRes);

  const postReq = makeRequest("http://localhost/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directoryId: "test",
      title: "console-log-note.txt",
      content: "Created via test-backend-cloud.ts",
      mimeType: "text/plain",
    }),
  });
  const postRes = await postFiles(postReq);
  await logResponse("POST /api/files", postRes);

  const fileContentReq = makeRequest(
    "http://localhost/api/file-content?fileId=file-1"
  );
  const fileContentRes = await getFileContent(fileContentReq);
  await logResponse("GET /api/file-content?fileId=file-1", fileContentRes);
}

async function testCloud() {
  console.log("\n=== Cloud function tests ===");

  try {
    const url = await upload_file_to_cloud({
      fileBytes: Buffer.from("Hello from cloud.ts"),
      objectName: "console-log-test.txt",
      contentType: "text/plain",
    });
    console.log("upload_file_to_cloud result:", url);
  } catch (error) {
    console.log("upload_file_to_cloud error:", error);
  }

  try {
    const result = await delete_file_from_cloud("console-log-test.txt");
    console.log("delete_file_from_cloud result:", result);
  } catch (error) {
    console.log("delete_file_from_cloud error:", error);
  }
}

await testBackend();
await testCloud();
