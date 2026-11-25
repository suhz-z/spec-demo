"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { AssetFloorPlan, type DemoRoom } from "@/components/inventory/asset-floor-plan";

import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, SITE, flowCrumbs, formatSqFt, type Plot } from "./flow-data";
import { FlowPlanStage, FlowShell } from "./flow-shell";

type Floor = "ground" | "first";

/**
 * Only reachable for plots whose data declares a floor-plan asset. The
 * Moolaparambu plots are site-plan parcels, so this screen is not in their
 * journey; it remains for plots that actually publish a floor plan.
 */
export function FloorPlanPage({ plot }: { plot: Plot }) {
  const [floor, setFloor] = useState<Floor>("ground");
  const [selectedRoom, setSelectedRoom] = useState<DemoRoom | null>(null);
  const [previewRoom, setPreviewRoom] = useState<DemoRoom | null>(null);
  const [roomCount, setRoomCount] = useState<number | null>(null);

  const shownRoom = previewRoom ?? selectedRoom;

  const handleSelect = useCallback((room: DemoRoom) => {
    setSelectedRoom(room);
    setPreviewRoom(null);
  }, []);

  const handlePreview = useCallback((room: DemoRoom | null) => {
    setPreviewRoom(room);
  }, []);

  const handleRooms = useCallback((rooms: DemoRoom[]) => {
    setRoomCount(rooms.length);
  }, []);

  const selectFloor = (value: Floor) => {
    setFloor(value);
    setSelectedRoom(null);
    setPreviewRoom(null);
    setRoomCount(null);
  };

  return (
    <FlowShell step={FLOW_STEPS.floorPlan} crumbs={flowCrumbs("floor-plan", plot.id)}>
      <FlowPageHead
        backHref="/plots"
        backLabel="Back to plots"
        title={`Plot ${plot.id}`}
        subtitle={`${plot.area} · ${formatSqFt(plot.areaSqFt)} · Floor plan`}
        aside={`${SITE.name} · ${SITE.region}`}
      />

      <div className="flow-plan-layout">
        <div className="flow-plan-main">
          <div className="flow-plan-toolbar">
            <div className="floor-tabs" role="group" aria-label="Floor">
              {(["ground", "first"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className="floor-tab"
                  aria-pressed={floor === value}
                  onClick={() => selectFloor(value)}
                >
                  {value === "ground" ? "Ground floor" : "First floor"}
                </button>
              ))}
            </div>
            <span className="flow-plan-summary">
              {roomCount === null ? "Loading plan…" : `${roomCount} rooms`}
            </span>
          </div>

          <FlowPlanStage>
            <AssetFloorPlan
              floor={floor}
              selectedRoomId={selectedRoom?.id}
              onSelect={handleSelect}
              onPreview={handlePreview}
              onRooms={handleRooms}
            />
          </FlowPlanStage>

          <div className="flow-plan-note">
            <span>Schematic floor plan · not to scale</span>
            <span>Room sizes as labelled on the plan</span>
          </div>
        </div>

        <aside className="flow-side-panel" aria-live="polite">
          <div className="panel-top">
            <span>{previewRoom ? "Room preview" : "Room details"}</span>
            <span>{shownRoom ? "ROOM" : "—"}</span>
          </div>

          {shownRoom ? (
            <div className="panel-detail">
              <div className="villa-title">
                <h2>{shownRoom.name}</h2>
              </div>
              <div className="villa-type">
                {floor === "ground" ? "Ground floor" : "First floor"} · indicative layout
              </div>
              <div className="room-data">
                <div>
                  <span>Room size</span>
                  <b>{shownRoom.size}</b>
                </div>
                <div>
                  <span>Area</span>
                  <b>
                    {shownRoom.areaSqFt === null
                      ? "To be confirmed"
                      : formatSqFt(shownRoom.areaSqFt)}
                  </b>
                </div>
                <div>
                  <span>Room type</span>
                  <b>
                    {shownRoom.outside ? "Outdoor" : shownRoom.service ? "Service" : "Interior"}
                  </b>
                </div>
              </div>
              <Link className="sg-cta panel-cta" href={`/plots/${plot.id}/summary`}>
                <span>View summary</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          ) : (
            <div className="panel-empty">
              <h2>Select a room</h2>
              <p>
                Choose a room to read its labelled size. The floor plan illustrates a possible villa
                arrangement on a {plot.area} plot.
              </p>
              <Link className="sg-cta panel-cta" href={`/plots/${plot.id}/summary`}>
                <span>View summary</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          )}
        </aside>
      </div>

      <div className="flow-page-foot">
        <span>
          Plot {plot.id} · {plot.area} · {formatSqFt(plot.areaSqFt)}
        </span>
        <span>Indicative layout only · not a construction drawing</span>
      </div>
    </FlowShell>
  );
}
