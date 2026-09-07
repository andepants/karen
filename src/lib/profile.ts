export type ProfileFacts = {
  title: string;
  facts: string[];
};

export function parseProfile(description: string): ProfileFacts {
  const parts = description
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  let title = "Provider";
  let body = parts;
  if (parts[0] && parts[0].length <= 48 && !parts[0].includes(". ")) {
    title = parts[0];
    body = parts.slice(1);
  }

  const facts = body
    .join(" ")
    .split(/(?<=[.!?])\s+/)
    .map((fact) => fact.trim())
    .filter((fact) => fact.length > 18)
    .map((fact) => fact.replace(/\s+/g, " "));

  return { title, facts };
}
