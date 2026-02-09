import type { Doc, Id } from "../../../../convex/_generated/dataModel";

export type AppointmentWithDetails = Doc<"appointments"> & {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  staffName: string;
  staffImageUrl?: string;
  services: Array<{
    serviceId: Id<"services">;
    serviceName: string;
    duration: number;
    price: number;
  }>;
};
