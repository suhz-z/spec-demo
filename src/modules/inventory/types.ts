import { z } from "zod";

export const villaStatusSchema = z.enum(["available", "reserved", "booked"]);

export const plotGeometrySchema = z
  .object({
    x: z.number().int(),
    y: z.number().int(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .refine(({ x, y, width, height }) => x >= 0 && y >= 0 && x + width <= 1000 && y + height <= 680);

export const publicVillaSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["3BHK", "4BHK"]).nullable(),
  builtUpAreaSqFt: z.number().int().positive().nullable(),
  plotAreaSqFt: z.number().int().positive().nullable(),
  floors: z.string().min(1),
  corner: z.boolean().nullable(),
  facing: z.string().min(1).nullable(),
  status: villaStatusSchema,
  priceAmountMinor: z.string().regex(/^\d+$/).nullable(),
  samplePrice: z.boolean(),
  mapGeometry: plotGeometrySchema.nullable(),
});

export const mapViewSchema = z
  .object({
    scale: z.number().min(1).max(2.4),
    x: z.number().min(-700).max(700),
    y: z.number().min(-476).max(476),
  })
  .refine(
    ({ scale, x, y }) => Math.abs(x) <= (scale - 1) * 500 && Math.abs(y) <= (scale - 1) * 340,
  );

export const inventoryPayloadSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("ready"),
    source: z.enum(["fixture", "database"]),
    pollIntervalSeconds: z.number().int().min(15).max(30),
    villas: z.array(publicVillaSchema),
  }),
  z.object({
    state: z.literal("empty"),
    source: z.literal("database"),
    message: z.string(),
  }),
  z.object({
    state: z.literal("pending"),
    source: z.literal("none"),
    message: z.string(),
  }),
  z.object({
    state: z.literal("error"),
    source: z.literal("database"),
    message: z.string(),
  }),
]);

export type PublicVilla = z.infer<typeof publicVillaSchema>;
export type InventoryPayload = z.infer<typeof inventoryPayloadSchema>;
export type MapView = z.infer<typeof mapViewSchema>;

export type FixtureRoom = {
  id: string;
  name: string;
  size: string;
  areaSqFt: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  service?: boolean;
  outside?: boolean;
};

export type FixtureFloorPlan = {
  floorNumber: number;
  label: string;
  rooms: readonly FixtureRoom[];
};

export type FixtureVilla = PublicVilla & {
  plans: readonly FixtureFloorPlan[];
};
