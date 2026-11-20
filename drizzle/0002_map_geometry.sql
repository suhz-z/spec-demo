ALTER TABLE "villas" ADD COLUMN "map_x" integer;--> statement-breakpoint
ALTER TABLE "villas" ADD COLUMN "map_y" integer;--> statement-breakpoint
ALTER TABLE "villas" ADD COLUMN "map_width" integer;--> statement-breakpoint
ALTER TABLE "villas" ADD COLUMN "map_height" integer;--> statement-breakpoint
ALTER TABLE "villas" ADD CONSTRAINT "villas_map_geometry_complete_check" CHECK (("villas"."map_x" is null and "villas"."map_y" is null and "villas"."map_width" is null and "villas"."map_height" is null) or ("villas"."map_x" is not null and "villas"."map_y" is not null and "villas"."map_width" is not null and "villas"."map_height" is not null and "villas"."map_width" > 0 and "villas"."map_height" > 0));