import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export async function ensureSchema() {
  const db = getDb();
  await db.execute(sql`
    create table if not exists sets (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique,
      name text not null,
      description text not null default '',
      new_cards_per_day integer not null default 20,
      reviews_per_day integer not null default 200,
      bury_new_siblings boolean not null default true,
      bury_review_siblings boolean not null default true,
      created_at timestamptz not null default now()
    )
  `);

  await db.execute(sql`alter table sources add column if not exists set_id uuid references sets(id) on delete set null`);
  await db.execute(sql`alter table people add column if not exists set_id uuid references sets(id) on delete set null`);
  await db.execute(sql`alter table cards add column if not exists kind text not null default 'face'`);
  await db.execute(sql`alter table cards add column if not exists buried_until timestamptz`);
  await db.execute(sql`alter table cards add column if not exists suspended boolean not null default false`);
  await db.execute(sql`alter table cards add column if not exists leech boolean not null default false`);
  await db.execute(sql`alter table review_logs add column if not exists previous_card jsonb`);
  await db.execute(sql`alter table review_logs add column if not exists review_time_ms integer`);

  await db.execute(sql`
    do $$ begin
      if exists (
        select 1 from pg_constraint
        where conrelid = 'cards'::regclass
          and contype = 'u'
          and pg_get_constraintdef(oid) like '%person_id%'
          and pg_get_constraintdef(oid) not like '%kind%'
      ) then
        alter table cards drop constraint if exists cards_person_id_unique;
        alter table cards drop constraint if exists cards_person_id_key;
      end if;
    exception when undefined_table then null;
    end $$
  `);

  await db.execute(sql`
    do $$ begin
      if not exists (
        select 1 from pg_constraint
        where conname = 'cards_person_kind_idx'
      ) then
        alter table cards add constraint cards_person_kind_idx unique (person_id, kind);
      end if;
    exception when duplicate_object then null;
    end $$
  `);

  await db.execute(sql`create index if not exists people_set_id_idx on people (set_id)`);
}
