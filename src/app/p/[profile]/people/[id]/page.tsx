import PersonPage from "../../../../people/[id]/page";

export default async function ProfilePersonPage({
  params,
}: {
  params: Promise<{ profile: string; id: string }>;
}) {
  const { profile, id } = await params;
  return PersonPage({
    params: Promise.resolve({ id }),
    profileSlug: profile,
  });
}
