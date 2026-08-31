import { getPlants } from '@/lib/dataLoggerApi';
import { PlantsList } from '@/components/data-logger/PlantsList';

export const dynamic = 'force-dynamic';

export default async function PlantsPage() {
  const plants = await getPlants();
  return <PlantsList plants={plants} />;
}
