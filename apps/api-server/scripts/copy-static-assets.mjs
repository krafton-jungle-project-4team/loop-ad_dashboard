import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath, URL } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
const distRoot = fileURLToPath(new URL("../dist", import.meta.url));
const copiedExtensions = new Set([".html"]);

copyStaticAssets(sourceRoot);

function copyStaticAssets(sourceDirectory) {
  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = join(sourceDirectory, entry.name);

    if (entry.isDirectory()) {
      copyStaticAssets(sourcePath);
      continue;
    }

    if (!copiedExtensions.has(extname(entry.name))) {
      continue;
    }

    const targetPath = join(distRoot, relative(sourceRoot, sourcePath));
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}
