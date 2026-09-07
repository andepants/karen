import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { portraitFileName, portraitSvg } from "../src/lib/portraits";
import { seedSets } from "../src/lib/seed-data";

async function main() {
  const dir = path.join(process.cwd(), "public", "portraits");
  await mkdir(dir, { recursive: true });
  for (const set of seedSets) {
    for (const person of set.people) {
      if (person.photoUrl) continue;
      await writeFile(
        path.join(dir, portraitFileName(person.name)),
        portraitSvg(person.name),
      );
    }
  }
  console.log(`Wrote portraits to ${dir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
