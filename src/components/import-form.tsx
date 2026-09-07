"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { unlockEditor } from "@/actions/auth";
import { confirmImport } from "@/actions/import";
import type { ExtractedPerson } from "@/lib/firecrawl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function ImportForm({ isEditor }: { isEditor: boolean }) {
  const [url, setUrl] = useState("");
  const [followProfiles, setFollowProfiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [people, setPeople] = useState<ExtractedPerson[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const selectedPeople = useMemo(
    () => people.filter((_, index) => selected[index] !== false),
    [people, selected],
  );

  async function scrape(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(null);
    setLoading(true);
    try {
      const response = await fetch("/api/import/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, followProfiles }),
      });
      const payload = (await response.json()) as {
        error?: string;
        title?: string;
        people?: ExtractedPerson[];
      };
      if (!response.ok) {
        throw new Error(payload.error || "Could not read that page");
      }
      setTitle(payload.title || "");
      const next = payload.people ?? [];
      setPeople(next);
      setSelected(Object.fromEntries(next.map((_, i) => [i, true])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await confirmImport({ url, title, people: selectedPeople });
    setSaving(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setSaved(`Added ${result.created} people${result.skipped ? `, skipped ${result.skipped} duplicates` : ""}.`);
    setPeople([]);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={scrape} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Website</Label>
          <Input
            id="url"
            type="url"
            required
            placeholder="https://example.com/team"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-11 bg-card/80"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={followProfiles}
            onCheckedChange={(value) => setFollowProfiles(value === true)}
          />
          Also follow profile links on this site (slower, more complete)
        </label>
        <Button type="submit" size="lg" disabled={loading || !isEditor} className="rounded-full px-6">
          {loading ? "Reading the garden…" : "Gather people"}
        </Button>
        {!isEditor ? (
          <p className="text-sm text-muted-foreground">
            Unlock with the editor passcode to import.
          </p>
        ) : null}
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-primary">{saved}</p> : null}

      {people.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-heading text-2xl">{title || "Found people"}</p>
              <p className="text-sm text-muted-foreground">
                {selectedPeople.length} selected of {people.length}
              </p>
            </div>
            <Button onClick={save} disabled={saving || selectedPeople.length === 0}>
              {saving ? "Planting…" : "Add to roster"}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {people.map((person, index) => (
              <Card key={`${person.name}-${index}`} className="overflow-hidden bg-card/90">
                <CardContent className="flex gap-3 p-3">
                  <Checkbox
                    checked={selected[index] !== false}
                    onCheckedChange={(value) =>
                      setSelected((current) => ({
                        ...current,
                        [index]: value === true,
                      }))
                    }
                    className="mt-1"
                  />
                  {person.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.photoUrl}
                      alt=""
                      className="size-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-16 rounded-full bg-secondary" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{person.name}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {person.description || "No description yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function UnlockForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      action={async (formData) => {
        const result = await unlockEditor(formData);
        if (result && "error" in result) {
          setError(result.error ?? null);
          return;
        }
        router.refresh();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="password">Editor passcode</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          className="bg-card/80 sm:w-56"
        />
      </div>
      <Button type="submit" variant="secondary">
        Unlock
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
