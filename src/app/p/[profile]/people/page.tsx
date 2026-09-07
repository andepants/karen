import PeoplePage from "../../../people/page";

export default async function ProfilePeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ profile: string }>;
  searchParams: Promise<{ set?: string }>;
}) {
  const { profile } = await params;
  return PeoplePage({ profileSlug: profile, searchParams });
}
