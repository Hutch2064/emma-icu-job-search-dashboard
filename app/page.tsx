import { DashboardClient } from "@/components/dashboard-client";
import { readDashboardData } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await readDashboardData();
  return <DashboardClient initialData={data} />;
}
