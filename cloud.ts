import { readFile } from "node:fs/promises";
import { basename } from "node:path";

type UploadFileToCloudOptions = {
  filePath?: string;
  fileBytes?: Buffer | Uint8Array | string;
  bucketName?: string;
  objectName?: string;
  contentType?: string;
};

type AwsSdkModule = {
  S3Client: new (config: {
    region: string;
    endpoint: string;
    credentials: { accessKeyId: string; secretAccessKey: string };
    forcePathStyle: boolean;
  }) => unknown;
  PutObjectCommand: new (input: {
    Bucket: string;
    Key: string;
    Body: Uint8Array | Buffer | string;
    ContentType?: string;
  }) => unknown;
  DeleteObjectCommand: new (input: { Bucket: string; Key: string }) => unknown;
};

const ACCESS_KEY =
  process.env.ACCESS_KEY ?? process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "";
const SECRET_KEY =
  process.env.SECRET_ACCESS_KEY ?? process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "";
const ENDPOINT_URL =
  process.env.ENDPOINT_URL ??
  (process.env.CLOUDFLARE_R2_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "");
const BUCKET_NAME =
  process.env.BUCKET_NAME ?? process.env.CLOUDFLARE_R2_BUCKET ?? "stylemyspace";
const BUCKET_PUB_URL =
  process.env.BUCKET_PUB_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ?? "";

function assertConfig() {
  if (!ACCESS_KEY || !SECRET_KEY || !ENDPOINT_URL || !BUCKET_NAME) {
    throw new Error(
      "Missing Cloudflare R2 config. Set ACCESS_KEY, SECRET_ACCESS_KEY, ENDPOINT_URL, BUCKET_NAME."
    );
  }
}

async function loadAwsSdk(): Promise<AwsSdkModule> {
  try {
    const runtimeImport = new Function(
      "moduleName",
      "return import(moduleName)"
    ) as (moduleName: string) => Promise<AwsSdkModule>;
    return await runtimeImport("@aws-sdk/client-s3");
  } catch {
    throw new Error(
      "Missing dependency '@aws-sdk/client-s3'. Install it to use cloud.ts operations."
    );
  }
}

async function getS3Client() {
  assertConfig();
  const { S3Client } = await loadAwsSdk();
  return new S3Client({
    region: "auto",
    endpoint: ENDPOINT_URL,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
    forcePathStyle: true,
  });
}

function inferContentType(objectName: string): string {
  const lower = objectName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function toBytes(input: Buffer | Uint8Array | string): Buffer | Uint8Array {
  if (typeof input !== "string") {
    return input;
  }
  return Buffer.from(input, "base64");
}

function getPublicUrl(objectName: string): string {
  if (!BUCKET_PUB_URL) {
    return objectName;
  }
  return `${BUCKET_PUB_URL.replace(/\/$/, "")}/${objectName}`;
}

export async function upload_file_to_cloud(options: UploadFileToCloudOptions = {}) {
  const { filePath, fileBytes, bucketName = BUCKET_NAME } = options;
  const objectName =
    options.objectName ?? (filePath ? basename(filePath) : "uploaded_file");

  const body =
    fileBytes !== undefined
      ? toBytes(fileBytes)
      : filePath
        ? await readFile(filePath)
        : (() => {
            throw new Error("Provide filePath or fileBytes");
          })();

  const contentType = options.contentType ?? inferContentType(objectName);
  const s3 = await getS3Client();
  const { PutObjectCommand } = await loadAwsSdk();

  await (s3 as { send: (command: unknown) => Promise<unknown> }).send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: objectName,
      Body: body,
      ContentType: contentType,
    })
  );

  return getPublicUrl(objectName);
}

export async function delete_file_from_cloud(
  fileName: string,
  bucketName = BUCKET_NAME
): Promise<"ok" | `error: ${string}`> {
  try {
    const s3 = await getS3Client();
    const { DeleteObjectCommand } = await loadAwsSdk();
    await (s3 as { send: (command: unknown) => Promise<unknown> }).send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      })
    );
    return "ok";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `error: ${message}`;
  }
}

export async function upload_file(filePath: string) {
  const fileName = basename(filePath);
  await upload_file_to_cloud({
    filePath,
    objectName: fileName,
    contentType: inferContentType(fileName),
  });
  return fileName;
}

export const cloudflare = {
  upload_file_to_cloud,
  delete_file_from_cloud,
  upload_file,
};

