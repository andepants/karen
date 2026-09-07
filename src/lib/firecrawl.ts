export type ExtractedPerson = {
  name: string;
  description: string;
  photoUrl: string | null;
  profileUrl: string | null;
};

const PEOPLE_SCHEMA = {
  type: "object",
  properties: {
    pageTitle: { type: "string" },
    people: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          photoUrl: { type: "string" },
          profileUrl: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  required: ["people"],
};

type ScrapeData = {
  json?: {
    pageTitle?: string;
    people?: Array<{
      name?: string;
      description?: string;
      role?: string;
      photoUrl?: string;
      profileUrl?: string;
    }>;
  };
  images?: string[];
  links?: string[];
  metadata?: { title?: string };
};

async function firecrawlScrape(url: string): Promise<ScrapeData> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      onlyMainContent: false,
      timeout: 120000,
      formats: [
        {
          type: "json",
          prompt:
            "Extract every person, team member, staff, faculty, or employee shown on this page. For each person include their full name, a short description (role, title, bio, or department), the URL of their portrait photo, and a profile/bio page URL if present. Skip logos, icons, and decorative images.",
          schema: PEOPLE_SCHEMA,
        },
        "images",
        "links",
      ],
    }),
  });

  const payload = (await response.json()) as {
    success?: boolean;
    data?: ScrapeData;
    error?: string;
    message?: string;
  };

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(
      payload.error || payload.message || `Firecrawl failed (${response.status})`,
    );
  }

  return payload.data;
}

function sameOrigin(base: string, href: string) {
  try {
    return new URL(href, base).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

function toPerson(
  raw: NonNullable<NonNullable<ScrapeData["json"]>["people"]>[number],
  pageUrl: string,
): ExtractedPerson | null {
  const name = raw.name?.trim();
  if (!name) return null;
  const description = (raw.description || raw.role || "").trim();
  let photoUrl = raw.photoUrl?.trim() || null;
  if (photoUrl) {
    try {
      photoUrl = new URL(photoUrl, pageUrl).toString();
    } catch {
      photoUrl = null;
    }
  }
  let profileUrl = raw.profileUrl?.trim() || null;
  if (profileUrl) {
    try {
      profileUrl = new URL(profileUrl, pageUrl).toString();
    } catch {
      profileUrl = null;
    }
  }
  return { name, description, photoUrl, profileUrl };
}

export async function extractPeopleFromUrl(
  pageUrl: string,
  options: { followProfiles?: boolean } = {},
) {
  const parsed = new URL(pageUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL must start with http or https");
  }

  const first = await firecrawlScrape(parsed.toString());
  const people: ExtractedPerson[] = [];
  const seen = new Set<string>();

  for (const raw of first.json?.people ?? []) {
    const person = toPerson(raw, parsed.toString());
    if (!person) continue;
    const key = person.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    people.push(person);
  }

  const title = first.json?.pageTitle || first.metadata?.title || parsed.hostname;

  if (options.followProfiles) {
    const candidates = [
      ...people.map((p) => p.profileUrl).filter(Boolean),
      ...(first.links ?? []),
    ]
      .filter((href): href is string => Boolean(href))
      .filter((href) => sameOrigin(parsed.toString(), href))
      .filter((href) => href !== parsed.toString())
      .slice(0, 30);

    const unique = [...new Set(candidates)];
    for (const href of unique) {
      try {
        const page = await firecrawlScrape(href);
        for (const raw of page.json?.people ?? []) {
          const person = toPerson(raw, href);
          if (!person) continue;
          const key = person.name.toLowerCase();
          if (seen.has(key)) {
            const existing = people.find(
              (p) => p.name.toLowerCase() === key,
            );
            if (existing) {
              existing.description ||= person.description;
              existing.photoUrl ||= person.photoUrl;
              existing.profileUrl ||= person.profileUrl || href;
            }
            continue;
          }
          seen.add(key);
          people.push({
            ...person,
            profileUrl: person.profileUrl || href,
          });
        }
      } catch {
        // Skip a failed profile page and keep the rest of the import.
      }
    }
  }

  return { title, people };
}
