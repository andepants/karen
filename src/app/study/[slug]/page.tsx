import { StudySetView } from "@/components/study-set-view";

export default async function StudySetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return StudySetView({ slug });
}
