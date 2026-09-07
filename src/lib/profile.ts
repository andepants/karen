export type ProfileFacts = {
  title: string;
  facts: string[];
};

const MAX_FACT = 160;
const MAX_FACTS = 6;

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

  const text = body.join(" ").replace(/\s+/g, " ").trim();
  const facts: string[] = [];
  const seen = new Set<string>();

  function add(value: string | null | undefined) {
    const fact = tidy(value);
    if (!fact) return;
    const key = fact.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    facts.push(fact);
  }

  add(
    match(text, /President of (?:a group of \d+ physicians, known as )?([^.]+)/i, (_, group) =>
      complete(`President of ${group}`),
    ),
  );
  add(
    match(text, /joined ([^.]+?) in (\d{4})/i, (_, place, year) =>
      complete(`Joined ${place} in ${year}`),
    ),
  );
  add(match(text, /native of ([^,.(]+)/i, (_, place) => complete(`From ${place.trim()}`)));
  add(
    match(
      text,
      /from ([^,.(]+), (Louisiana|Texas|Florida|California|Colorado|Arizona|Oklahoma|New York)/i,
      (_, city, state) => complete(`From ${city.trim()}, ${state}`),
    ),
  );
  add(match(text, /fluent in ([^.]+)/i, (_, langs) => complete(`Fluent in ${langs}`)));
  add(match(text, /board certified[^.]+/i, (full) => complete(full)));
  add(
    match(text, /(?:completed (?:her|his|their) )?(?:four-year )?residency[^.]+/i, (full) =>
      complete(full.replace(/^(?:completed (?:her|his|their) )/i, "")),
    ),
  );
  add(
    match(text, /medical degree from ([^.]+)/i, (_, school) => complete(`MD from ${school}`)),
  );
  add(
    match(text, /earned (?:her|his|their) medical degree from ([^.]+)/i, (_, school) =>
      complete(`MD from ${school}`),
    ),
  );
  add(match(text, /undergraduate[^.]+/i, (full) => complete(full)));
  add(match(text, /Chief Resident[^.]+/i, (full) => complete(full)));
  add(match(text, /voted[^.]+/i, (full) => complete(full)));

  if (facts.length < 3) {
    for (const sentence of splitSentences(text)) {
      if (facts.length >= MAX_FACTS) break;
      if (/spare time|free time|husband|wife|children|dog|hobbies|outside of/i.test(sentence)) {
        continue;
      }
      add(complete(sentence));
    }
  }

  return { title, facts: facts.slice(0, MAX_FACTS) };
}

function match(
  text: string,
  pattern: RegExp,
  format: (...args: string[]) => string | null,
) {
  const found = text.match(pattern);
  if (!found) return null;
  return format(...found);
}

function splitSentences(text: string) {
  return text
    .replace(/\b(Dr|Mr|Mrs|Ms|St|Ft)\./g, "$1")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 24);
}

function complete(value: string | null | undefined) {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").replace(/^[,.\s]+|[,.\s]+$/g, "").trim();
  if (text.length < 18 || text.length > MAX_FACT) return null;
  return text;
}

function tidy(value: string | null | undefined) {
  if (!value) return "";
  let text = value.replace(/\s+/g, " ").trim();
  text = text.replace(/^(?:he|she|they)\s+/i, "");
  if (text.length < 18 || text.length > MAX_FACT) return "";
  if (!/[.!?]$/.test(text)) text += ".";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
