"use client";

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
import type { people as peopleTable } from "@/db/schema";

type Person = typeof peopleTable.$inferSelect;

export function PeopleGrid({
  people,
  isEditor,
}: {
  people: Person[];
  isEditor: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {isEditor ? <AddPersonCard /> : null}
      {people.map((person) => (
        <PersonCard key={person.id} person={person} isEditor={isEditor} />
      ))}
    </div>
  );
}

function AddPersonCard() {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex h-full min-h-48 flex-col justify-center p-5">
        <p className="font-heading text-xl">Add someone</p>
        <PersonForm />
      </CardContent>
    </Card>
  );
}

function PersonCard({ person, isEditor }: { person: Person; isEditor: boolean }) {
  return (
    <Card className={person.archived ? "opacity-60" : "bg-card/90"}>
      <CardContent className="space-y-3 p-5">
        {person.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photoUrl}
            alt={person.name}
            className="aspect-square w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-2xl bg-secondary font-heading text-4xl text-muted-foreground">
            {person.name.slice(0, 1)}
          </div>
        )}
        <div>
          <h2 className="font-heading text-2xl leading-tight">{person.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {person.description || "No description yet"}
          </p>
        </div>
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
                <PersonForm person={person} />
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPersonArchived(person.id, !person.archived)}
            >
              {person.archived ? "Restore" : "Hide"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PersonForm({ person }: { person?: Person }) {
  const [error, setError] = useState<string | null>(null);
  const action = person ? updatePerson : createPerson;

  return (
    <form
      className="space-y-3"
      action={async (formData) => {
        const result = await action(formData);
        if (result && "error" in result) setError(result.error ?? null);
      }}
    >
      {person ? <input type="hidden" name="id" value={person.id} /> : null}
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
        <Label htmlFor={`description-${person?.id ?? "new"}`}>Description</Label>
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
