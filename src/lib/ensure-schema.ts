import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export async function ensureSchema() {
  const db = getDb();

  await db.execute(sql`
    create table if not exists profiles (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique,
      name text not null,
      session integer not null default 10,
      bury_siblings boolean not null default true,
      created_at timestamptz not null default now()
    )
  `);

  await db.execute(sql`
    insert into profiles (slug, name)
    values ('karen', 'Karen')
    on conflict (slug) do nothing
  `);

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

  await db.execute(sql`
    create table if not exists sources (
      id uuid primary key default gen_random_uuid(),
      set_id uuid references sets(id) on delete set null,
      url text not null,
      title text,
      created_at timestamptz not null default now()
    )
  `);

  await db.execute(sql`
    create table if not exists people (
      id uuid primary key default gen_random_uuid(),
      set_id uuid references sets(id) on delete set null,
      source_id uuid references sources(id) on delete set null,
      name text not null,
      normalized_name text not null,
      description text not null default '',
      title text,
      facts jsonb,
      photo_url text,
      profile_url text,
      archived boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await db.execute(sql`
    create table if not exists cards (
      id uuid primary key default gen_random_uuid(),
      profile_id uuid references profiles(id) on delete cascade,
      person_id uuid not null references people(id) on delete cascade,
      kind text not null default 'face',
      due timestamptz not null,
      stability real not null,
      difficulty real not null,
      elapsed_days real not null,
      scheduled_days real not null,
      learning_steps integer not null,
      reps integer not null,
      lapses integer not null,
      state integer not null,
      last_review timestamptz,
      buried_until timestamptz,
      suspended boolean not null default false,
      leech boolean not null default false,
      created_at timestamptz not null default now()
    )
  `);

  await db.execute(sql`
    create table if not exists review_logs (
      id uuid primary key default gen_random_uuid(),
      card_id uuid not null references cards(id) on delete cascade,
      rating integer not null,
      state integer not null,
      due timestamptz not null,
      stability real not null,
      difficulty real not null,
      elapsed_days real not null,
      last_elapsed_days real not null,
      scheduled_days real not null,
      learning_steps integer not null,
      reviewed_at timestamptz not null,
      previous_card jsonb,
      review_time_ms integer
    )
  `);

  await db.execute(sql`alter table sources add column if not exists set_id uuid references sets(id) on delete set null`);
  await db.execute(sql`alter table people add column if not exists set_id uuid references sets(id) on delete set null`);
  await db.execute(sql`alter table people add column if not exists title text`);
  await db.execute(sql`alter table people add column if not exists facts jsonb`);
  await db.execute(sql`alter table cards add column if not exists kind text not null default 'face'`);
  await db.execute(sql`alter table cards add column if not exists buried_until timestamptz`);
  await db.execute(sql`alter table cards add column if not exists suspended boolean not null default false`);
  await db.execute(sql`alter table cards add column if not exists leech boolean not null default false`);
  await db.execute(sql`alter table cards add column if not exists profile_id uuid references profiles(id) on delete cascade`);
  await db.execute(sql`alter table review_logs add column if not exists previous_card jsonb`);
  await db.execute(sql`alter table review_logs add column if not exists review_time_ms integer`);

  await db.execute(sql`create index if not exists people_normalized_name_idx on people (normalized_name)`);
  await db.execute(sql`create index if not exists people_set_id_idx on people (set_id)`);
  await db.execute(sql`create index if not exists cards_due_idx on cards (due)`);
  await db.execute(sql`create index if not exists cards_state_idx on cards (state)`);
  await db.execute(sql`create index if not exists cards_profile_id_idx on cards (profile_id)`);
  await db.execute(sql`create index if not exists review_logs_reviewed_at_idx on review_logs (reviewed_at)`);

  await db.execute(sql`
    update cards
    set profile_id = (select id from profiles where slug = 'karen' limit 1)
    where profile_id is null
  `);

  await db.execute(sql`
    do $$ begin
      alter table cards drop constraint if exists cards_person_id_unique;
      alter table cards drop constraint if exists cards_person_id_key;
    exception when undefined_table or undefined_object then null;
    end $$
  `);

  await db.execute(sql`
    do $$ begin
      alter table cards drop constraint if exists cards_person_kind_idx;
    exception when undefined_table or undefined_object then null;
    end $$
  `);
  await db.execute(sql`drop index if exists cards_person_kind_idx`);

  await db.execute(sql`
    do $$ begin
      if not exists (
        select 1 from pg_constraint where conname = 'cards_profile_person_kind_idx'
      ) then
        alter table cards add constraint cards_profile_person_kind_idx unique (profile_id, person_id, kind);
      end if;
    exception when duplicate_object or unique_violation then null;
    end $$
  `);
}
