import HomePage from "../../page";

export default async function ProfileHomePage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;
  return HomePage({ profileSlug: profile });
}
