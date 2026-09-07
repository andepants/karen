import { StudySetView } from "@/components/study-set-view";

export default async function ProfileStudyPage({
  params,
}: {
  params: Promise<{ profile: string; slug: string }>;
}) {
  const { profile, slug } = await params;
  return StudySetView({ slug, profileSlug: profile });
}
