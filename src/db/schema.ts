import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const sets = pgTable("sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  newCardsPerDay: integer("new_cards_per_day").notNull().default(20),
  reviewsPerDay: integer("reviews_per_day").notNull().default(200),
  buryNewSiblings: boolean("bury_new_siblings").notNull().default(true),
  buryReviewSiblings: boolean("bury_review_siblings").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  setId: uuid("set_id").references(() => sets.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const people = pgTable(
  "people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    setId: uuid("set_id").references(() => sets.id, { onDelete: "set null" }),
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    description: text("description").notNull().default(""),
    title: text("title"),
    facts: jsonb("facts").$type<string[] | null>(),
    photoUrl: text("photo_url"),
    profileUrl: text("profile_url"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("people_normalized_name_idx").on(table.normalizedName),
    index("people_set_id_idx").on(table.setId),
  ],
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("face"),
    due: timestamp("due", { withTimezone: true }).notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    elapsedDays: real("elapsed_days").notNull(),
    scheduledDays: real("scheduled_days").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    reps: integer("reps").notNull(),
    lapses: integer("lapses").notNull(),
    state: integer("state").notNull(),
    lastReview: timestamp("last_review", { withTimezone: true }),
    buriedUntil: timestamp("buried_until", { withTimezone: true }),
    suspended: boolean("suspended").notNull().default(false),
    leech: boolean("leech").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("cards_person_kind_idx").on(table.personId, table.kind),
    index("cards_due_idx").on(table.due),
    index("cards_state_idx").on(table.state),
  ],
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    state: integer("state").notNull(),
    due: timestamp("due", { withTimezone: true }).notNull(),
    stability: real("stability").notNull(),
    difficulty: real("difficulty").notNull(),
    elapsedDays: real("elapsed_days").notNull(),
    lastElapsedDays: real("last_elapsed_days").notNull(),
    scheduledDays: real("scheduled_days").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    previousCard: jsonb("previous_card").$type<Record<string, unknown>>(),
    reviewTimeMs: integer("review_time_ms"),
  },
  (table) => [index("review_logs_reviewed_at_idx").on(table.reviewedAt)],
);

export const setsRelations = relations(sets, ({ many }) => ({
  people: many(people),
  sources: many(sources),
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  set: one(sets, {
    fields: [sources.setId],
    references: [sets.id],
  }),
  people: many(people),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  set: one(sets, {
    fields: [people.setId],
    references: [sets.id],
  }),
  source: one(sources, {
    fields: [people.sourceId],
    references: [sources.id],
  }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  person: one(people, {
    fields: [cards.personId],
    references: [people.id],
  }),
  logs: many(reviewLogs),
}));

export const reviewLogsRelations = relations(reviewLogs, ({ one }) => ({
  card: one(cards, {
    fields: [reviewLogs.cardId],
    references: [cards.id],
  }),
}));
