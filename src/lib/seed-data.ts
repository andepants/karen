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
    name: "Practice",
    description: "20 people. Photo and name cards.",
    people: [
      { name: "Mira Chen", description: "Product" },
      { name: "Jonah Alvarez", description: "Design" },
      { name: "Priya Nair", description: "Engineering" },
      { name: "Ellis Ward", description: "Research" },
      { name: "Samira Okonkwo", description: "People" },
      { name: "Theo Berg", description: "Data" },
      { name: "Hana Suzuki", description: "Support" },
      { name: "Caleb Nguyen", description: "Mobile" },
      { name: "Lila Moreau", description: "Brand" },
      { name: "Omar Haddad", description: "Security" },
      { name: "Wren Patel", description: "Platform" },
      { name: "Sofia Rossi", description: "Marketing" },
      { name: "Isaac Klein", description: "Finance" },
      { name: "Amina Diallo", description: "Operations" },
      { name: "Nico Vargas", description: "Growth" },
      { name: "June Park", description: "QA" },
      { name: "Rafael Costa", description: "Infrastructure" },
      { name: "Ivy Holm", description: "Legal" },
      { name: "Mateo Silva", description: "Sales" },
      { name: "Quinn Abernathy", description: "Founder" },
    ],
  },
  {
    slug: STUDIO_NEIGHBORS_SLUG,
    name: "Neighbors",
    description: "8 people.",
    people: [
      { name: "Pearl Kim", description: "Florist" },
      { name: "Anton Ruiz", description: "Baker" },
      { name: "Yara Mensah", description: "Photographer" },
      { name: "Leo Strauss", description: "Teacher" },
      { name: "Naomi Brooks", description: "Bookseller" },
      { name: "Diego Santos", description: "Barista" },
      { name: "Freya Lind", description: "Ceramicist" },
      { name: "Hugo Blanchet", description: "Tailor" },
    ],
  },
];
