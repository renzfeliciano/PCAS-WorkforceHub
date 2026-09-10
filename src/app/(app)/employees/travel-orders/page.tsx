import { connectMongoDB } from "@/lib/mongodb";
import { MongoTravelOrderRepository } from "@/repositories/travel-order-repository";
import { listTravelOrders } from "@/services/travel-order-service";
import { TravelOrdersModule } from "@/features/travel-orders/travel-orders-module";

export default async function TravelOrdersPage() {
  await connectMongoDB();
  const initialData = await listTravelOrders(new MongoTravelOrderRepository(), { page: 1, pageSize: 20 });
  return <TravelOrdersModule initialData={initialData} />;
}
