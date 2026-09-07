import { connectMongoDB } from "@/lib/mongodb";
import { MongoTravelOrderRepository } from "@/repositories/travel-order-repository";
import { listTravelOrders } from "@/services/travel-order-service";
import { TravelOrdersModule } from "@/features/travel-orders/travel-orders-module";

export default async function TravelOrdersPage() {
  await connectMongoDB();
  const items = await listTravelOrders(new MongoTravelOrderRepository());
  return <TravelOrdersModule initialItems={items} />;
}
