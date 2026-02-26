import type { Id } from "../../../../convex/_generated/dataModel";

export interface SimulationRecord {
  _id: Id<"aiSimulations">;
  imageStorageId: Id<"_storage">;
  resultImageStorageId?: Id<"_storage">;
  status: string;
  designCatalogId?: Id<"designCatalog">;
  simulationType: "catalog" | "prompt";
  promptText?: string;
  createdAt: number;
}
