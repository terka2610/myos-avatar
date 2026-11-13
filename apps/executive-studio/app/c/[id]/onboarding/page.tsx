import { OnboardingScreen } from "@/components/OnboardingScreen";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OnboardingScreen id={id} />;
}
