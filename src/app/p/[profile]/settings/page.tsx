import SettingsPage from "../../../settings/page";

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;
  return SettingsPage({ profileSlug: profile });
}
