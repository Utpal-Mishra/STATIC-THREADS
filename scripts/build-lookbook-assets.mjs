import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const sourceDir = join(process.cwd(), "data", "lookbook-assets");
const outputDir = join(process.cwd(), "public", "lookbooks");

const jobs = [
  {
    name: "coastal-blue",
    chunks: [
      "coastal-blue.00.b64",
      "coastal-blue.01.b64",
      "coastal-blue.02.b64",
      "coastal-blue.03.b64"
    ],
    expectedBytes: 48011
  },
  {
    name: "olive-neutral",
    chunks: [
      "olive-refined.00.b64",
      "olive-refined.01.b64",
      "olive-refined.02.b64",
      "olive-refined.03.b64"
    ],
    expectedBytes: 16890
  }
];

function assertWebP(bytes, job) {
  if (bytes.length !== job.expectedBytes) {
    throw new Error(
      `${job.name}: expected ${job.expectedBytes} bytes, received ${bytes.length}`
    );
  }

  if (
    bytes.subarray(0, 4).toString("ascii") !== "RIFF" ||
    bytes.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    throw new Error(`${job.name}: reconstructed asset is not a valid WebP container`);
  }
}

await mkdir(outputDir, { recursive: true });

for (const job of jobs) {
  const encodedParts = await Promise.all(
    job.chunks.map((chunk) => readFile(join(sourceDir, chunk), "utf8"))
  );
  const bytes = Buffer.from(encodedParts.map((part) => part.trim()).join(""), "base64");

  assertWebP(bytes, job);
  await writeFile(join(outputDir, `${job.name}.webp`), bytes);
  console.log(`Built ${job.name}.webp (${bytes.length} bytes)`);
}
