export type SeedPerson = {
  name: string;
  description: string;
};

export type SeedSet = {
  slug: string;
  name: string;
  description: string;
  people: SeedPerson[];
};

export const GARDEN_TEST_SLUG = "garden-test";
export const STUDIO_NEIGHBORS_SLUG = "studio-neighbors";

export const seedSets: SeedSet[] = [
  {
    slug: GARDEN_TEST_SLUG,
    name: "Garden Test",
    description:
      "Twenty faces for checking Anki-style study: photo→name, name→photo, FSRS ratings, bury, undo, and daily limits.",
    people: [
      { name: "Mira Chen", description: "Product lead who opens every meeting with a lily sketch." },
      { name: "Jonah Alvarez", description: "Designer who keeps the brand in cream, moss, and ink." },
      { name: "Priya Nair", description: "Engineer shipping the spaced-repetition queue." },
      { name: "Ellis Ward", description: "Researcher timing how long a face stays nameless." },
      { name: "Samira Okonkwo", description: "People partner who remembers everyone’s dog’s name." },
      { name: "Theo Berg", description: "Data scientist tuning retention at ninety percent." },
      { name: "Hana Suzuki", description: "Support wizard who answers before the ticket lands." },
      { name: "Caleb Nguyen", description: "Mobile engineer who reviews cards on the train." },
      { name: "Lila Moreau", description: "Brand writer with a pocket full of garden metaphors." },
      { name: "Omar Haddad", description: "Security lead who never skips a Hard rating." },
      { name: "Wren Patel", description: "Platform engineer keeping the neon soil watered." },
      { name: "Sofia Rossi", description: "Marketer who can name a face from a hallway wave." },
      { name: "Isaac Klein", description: "Finance partner counting lilies instead of beans." },
      { name: "Amina Diallo", description: "Ops lead who buries a card only when the kettle boils." },
      { name: "Nico Vargas", description: "Growth strategist who treats Easy as a rare gift." },
      { name: "June Park", description: "QA who files a bug when a portrait looks too alike." },
      { name: "Rafael Costa", description: "Infra gardener of blobs, queues, and quiet nights." },
      { name: "Ivy Holm", description: "Counsel who tags leeches instead of deleting people." },
      { name: "Mateo Silva", description: "Sales lead who studies names before every onsite." },
      { name: "Quinn Abernathy", description: "Founder who planted the first face in the garden." },
    ],
  },
  {
    slug: STUDIO_NEIGHBORS_SLUG,
    name: "Studio Neighbors",
    description: "A smaller second set so you can switch decks the way Anki switches decks.",
    people: [
      { name: "Pearl Kim", description: "Florist next door who trades stems for coffee." },
      { name: "Anton Ruiz", description: "Baker who scores loaves like flashcard intervals." },
      { name: "Yara Mensah", description: "Photographer catching faces in the stairwell light." },
      { name: "Leo Strauss", description: "Violin teacher whose studio smells like rosin." },
      { name: "Naomi Brooks", description: "Bookseller who shelves memoirs by first name." },
      { name: "Diego Santos", description: "Barista who never asks for a name twice." },
      { name: "Freya Lind", description: "Ceramicist glazing cups the color of moss." },
      { name: "Hugo Blanchet", description: "Tailor who pins hems while reciting names." },
    ],
  },
];
