"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createPerson,
  setPersonArchived,
  updatePerson,
} from "@/actions/people";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { gradeTone, type MemoryGrade } from "@/lib/grades";
import { DEFAULT_PROFILE_SLUG, profileHref } from "@/lib/profile-path";
import type { people as peopleTable, sets as setsTable } from "@/db/schema";

type Person = typeof peopleTable.$inferSelect;
type SetRow = typeof setsTable.$inferSelect;

export function PeopleGrid({
  people,
  sets,
  isEditor,
  grades,
  profileSlug = DEFAULT_PROFILE_SLUG,
}: {
  people: Person[];
  sets: SetRow[];
  isEditor: boolean;
  grades: Record<string, MemoryGrade>;
  profileSlug?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {isEditor ? <AddPersonCard sets={sets} /> : null}
      {people.map((person) => (
        <PersonCard
          key={person.id}
          person={person}
          sets={sets}
          isEditor={isEditor}
          grade={grades[person.id] ?? "—"}
          profileSlug={profileSlug}
        />
      ))}
    </div>
  );
}

function AddPersonCard({ sets }: { sets: SetRow[] }) {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex h-full min-h-36 flex-col justify-center p-4">
        <p className="font-heading text-lg">Add</p>
        <PersonForm sets={sets} />
      </CardContent>
    </Card>
  );
}

function PersonCard({
  person,
  sets,
  isEditor,
  grade,
  profileSlug,
}: {
  person: Person;
  sets: SetRow[];
  isEditor: boolean;
  grade: MemoryGrade;
  profileSlug: string;
}) {
  return (
    <Card className={person.archived ? "opacity-60" : "bg-card/90"}>
      <CardContent className="space-y-2 p-3">
        <Link href={profileHref(profileSlug, `/people/${person.id}`)} className="block">
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photoUrl}
              alt={person.name}
              className="aspect-square w-full rounded-xl object-cover object-top"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-xl bg-secondary font-heading text-3xl text-muted-foreground">
              {person.name.slice(0, 1)}
            </div>
          )}
          <div className="mt-2 flex items-start justify-between gap-2">
            <h2 className="font-heading text-lg leading-tight">{person.name}</h2>
            <span className={`text-sm font-medium ${gradeTone(grade)}`}>{grade}</span>
          </div>
        </Link>
        {isEditor ? (
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit {person.name}</DialogTitle>
                </DialogHeader>
                <PersonForm person={person} sets={sets} />
              </DialogContent>
            </Dialog>
            <HideButton person={person} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HideButton({ person }: { person: Person }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await setPersonArchived(person.id, !person.archived);
        router.refresh();
      }}
    >
      {person.archived ? "Restore" : "Hide"}
    </Button>
  );
}

function PersonForm({ person, sets }: { person?: Person; sets: SetRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const action = person ? updatePerson : createPerson;

  return (
    <form
      className="space-y-3"
      action={async (formData) => {
        const result = await action(formData);
        if (result && "error" in result) {
          setError(result.error ?? null);
          return;
        }
        router.refresh();
      }}
    >
      {person ? <input type="hidden" name="id" value={person.id} /> : null}
      {sets.length ? (
        <div className="space-y-1">
          <Label htmlFor={`set-${person?.id ?? "new"}`}>Deck</Label>
          <select
            id={`set-${person?.id ?? "new"}`}
            name="setId"
            defaultValue={person?.setId ?? sets[0]?.id}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            {sets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor={`name-${person?.id ?? "new"}`}>Name</Label>
        <Input
          id={`name-${person?.id ?? "new"}`}
          name="name"
          required
          defaultValue={person?.name}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`description-${person?.id ?? "new"}`}>Notes</Label>
        <Textarea
          id={`description-${person?.id ?? "new"}`}
          name="description"
          defaultValue={person?.description ?? ""}
          rows={3}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`photo-${person?.id ?? "new"}`}>Photo</Label>
        <Input id={`photo-${person?.id ?? "new"}`} name="photo" type="file" accept="image/*" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit">{person ? "Save" : "Add"}</Button>
    </form>
  );
}
