import { SummaryScreen } from "@/components/SummaryScreen";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SummaryScreen id={id} />;
}
