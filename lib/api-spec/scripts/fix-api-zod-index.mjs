import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(
  __dirname,
  "..",
  "..",
  "api-zod",
  "src",
  "index.ts",
);

writeFileSync(
  indexPath,
  `export * from "./generated/api";\nexport * as types from "./generated/types";\nexport * from "./constants";\n`,
);
