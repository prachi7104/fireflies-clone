import { notFound } from "next/navigation";

import { MeetingDetailView } from "@/components/meeting-detail/MeetingDetailView";

// In Next 16, params and searchParams are Promises. ?t=<seconds> opens the meeting at that moment.
export default async function MeetingPage(props: PageProps<"/meetings/[id]">) {
  const { id } = await props.params;
  const { t } = await props.searchParams;

  const meetingId = Number(id);
  if (!Number.isInteger(meetingId) || meetingId <= 0) notFound();

  const seconds = Number(Array.isArray(t) ? t[0] : t);
  const initialMs = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds * 1000) : 0;

  return <MeetingDetailView id={meetingId} initialMs={initialMs} />;
}
