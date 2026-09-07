import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { portraitFileName, portraitSvg } from "../src/lib/portraits";
import { seedSets } from "../src/lib/seed-data";
import { seedTestSets } from "../src/lib/seed";

config({ path: ".env.local" });

async function writePortraits() {
  const dir = path.join(process.cwd(), "public", "portraits");
  await mkdir(dir, { recursive: true });
  for (const set of seedSets) {
    for (const person of set.people) {
      const file = path.join(dir, portraitFileName(person.name));
      await writeFile(file, portraitSvg(person.name));
    }
  }
}

async function main() {
  await writePortraits();
  const created = await seedTestSets();
  console.log(JSON.stringify(created, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
