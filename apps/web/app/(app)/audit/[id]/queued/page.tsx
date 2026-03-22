import { redirect } from "next/navigation";

export default async function QueuedRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/audit/${id}`);
}
