import { publicHttpUrl } from "./urls";

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
          role: { type: "string" },
          bio: { type: "string" },
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
      bio?: string;
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
            "Extract every person, provider, doctor, clinician, team member, or staff shown on this page. For each person include their full name with credentials, their role or specialty, their complete biography text (every paragraph about them), the URL of their portrait photo, and a profile/bio page URL if present. Do not summarize the bio. Skip logos, icons, decorative images, and patients in testimonials.",
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
  const left = publicHttpUrl(href, base);
  const right = publicHttpUrl(base);
  return Boolean(left && right && left.origin === right.origin);
}

function resolvePageUrl(href: string, base: string) {
  return publicHttpUrl(href, base)?.toString() ?? null;
}

function toPerson(
  raw: NonNullable<NonNullable<ScrapeData["json"]>["people"]>[number],
  pageUrl: string,
): ExtractedPerson | null {
  const name = raw.name?.trim();
  if (!name) return null;
  const role = (raw.role || "").trim();
  const bio = (raw.bio || "").trim();
  const description = [role || raw.description, bio]
    .filter(Boolean)
    .join("\n\n")
    .trim() || (raw.description || "").trim();
  const photoUrl = raw.photoUrl?.trim()
    ? resolvePageUrl(raw.photoUrl.trim(), pageUrl)
    : null;
  const profileUrl = raw.profileUrl?.trim()
    ? resolvePageUrl(raw.profileUrl.trim(), pageUrl)
    : null;
  return { name, description, photoUrl, profileUrl };
}

export async function extractPeopleFromUrl(
  pageUrl: string,
  options: { followProfiles?: boolean } = {},
) {
  const parsed = publicHttpUrl(pageUrl);
  if (!parsed) {
    throw new Error("URL must be a public http or https address");
  }

  const first = await firecrawlScrape(parsed.toString());
  const byName = new Map<string, ExtractedPerson>();

  function addPerson(person: ExtractedPerson, fallbackProfile?: string) {
    const key = person.name.toLowerCase();
    const next = {
      ...person,
      profileUrl: person.profileUrl || fallbackProfile || null,
    };
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, next);
      return;
    }
    if (next.description.length > existing.description.length) {
      existing.description = next.description;
    }
    existing.photoUrl ||= next.photoUrl;
    existing.profileUrl ||= next.profileUrl;
  }

  for (const raw of first.json?.people ?? []) {
    const person = toPerson(raw, parsed.toString());
    if (person) addPerson(person);
  }

  const title = first.json?.pageTitle || first.metadata?.title || parsed.hostname;
  const shouldFollow =
    options.followProfiles ||
    /provider-bio|our-providers|\/team|\/staff|\/doctors/i.test(parsed.pathname);

  if (shouldFollow) {
    const candidates = [
      ...[...byName.values()].map((person) => person.profileUrl),
      ...(first.links ?? []),
    ]
      .filter((href): href is string => Boolean(href))
      .filter((href) => sameOrigin(parsed.toString(), href))
      .filter((href) => href !== parsed.toString())
      .filter((href) =>
        /provider-bio|our-providers|\/team\/|\/staff\/|\/doctors\//i.test(href),
      )
      .slice(0, 45);

    for (const href of [...new Set(candidates)]) {
      try {
        const page = await firecrawlScrape(href);
        for (const raw of page.json?.people ?? []) {
          const person = toPerson(raw, href);
          if (person) addPerson(person, href);
        }
      } catch {
        // Skip a failed profile page and keep the rest of the import.
      }
    }
  }

  return { title, people: [...byName.values()] };
}
