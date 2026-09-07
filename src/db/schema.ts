import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
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
    sourceId: uuid("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    description: text("description").notNull().default(""),
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
  (table) => [index("people_normalized_name_idx").on(table.normalizedName)],
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" })
      .unique(),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
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
  },
  (table) => [index("review_logs_reviewed_at_idx").on(table.reviewedAt)],
);

export const sourcesRelations = relations(sources, ({ many }) => ({
  people: many(people),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  source: one(sources, {
    fields: [people.sourceId],
    references: [sources.id],
  }),
  card: one(cards, {
    fields: [people.id],
    references: [cards.personId],
  }),
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
