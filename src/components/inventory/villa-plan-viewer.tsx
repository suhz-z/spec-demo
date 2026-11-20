"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { useMobileFocusTrap } from "@/lib/use-mobile-focus-trap";
import type { FixtureFloorPlan, FixtureRoom, PublicVilla } from "@/modules/inventory/types";

import { AssetFloorPlan, type DemoRoom } from "./asset-floor-plan";

type VillaPlanViewerProps = {
  villa: PublicVilla;
  plans: readonly FixtureFloorPlan[];
  /** Render the supplied schematic SVG assets from /public for demo purposes. */
  useDemoAssets?: boolean;
};

type RoomView = { id: string; name: string; size: string; areaSqFt: number | null };

function RoomShape({
  room,
  active,
  onPreview,
  onClearPreview,
  onSelect,
}: {
  room: FixtureRoom;
  active: boolean;
  onPreview: (room: FixtureRoom) => void;
  onClearPreview: (roomId: string) => void;
  onSelect: (room: FixtureRoom) => void;
}) {
  const areaLabel =
    room.areaSqFt === null ? "area to be confirmed" : `${room.areaSqFt} square feet`;
  const sizeLabel = room.size === "To be confirmed" ? "Size pending" : room.size;
  const modifiers = [
    "sg-room",
    room.service && "is-service",
    room.outside && "is-outside",
    active && "is-active",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      aria-label={`${room.name}, ${room.size}, ${areaLabel}`}
      aria-pressed={active}
      className={modifiers}
      data-room-id={room.id}
      onBlur={() => onClearPreview(room.id)}
      onClick={() => onSelect(room)}
      onFocus={() => onPreview(room)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(room);
        }
      }}
      onPointerEnter={() => onPreview(room)}
      onPointerLeave={() => onClearPreview(room.id)}
      role="button"
      tabIndex={0}
    >
      <rect x={room.x} y={room.y} width={room.width} height={room.height} />
      <text className="sg-room__name" x={room.x + room.width / 2} y={room.y + room.height / 2 - 4}>
        {room.name}
      </text>
      <text className="sg-room__size" x={room.x + room.width / 2} y={room.y + room.height / 2 + 14}>
        {sizeLabel}
      </text>
    </g>
  );
}

export function VillaPlanViewer({ villa, plans, useDemoAssets = false }: VillaPlanViewerProps) {
  const [activeFloorNumber, setActiveFloorNumber] = useState(plans[0]?.floorNumber ?? 0);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [previewRoomId, setPreviewRoomId] = useState<string>();
  const [demoRooms, setDemoRooms] = useState<DemoRoom[]>([]);
  const planRef = useRef<HTMLDivElement>(null);
  const roomPanelRef = useRef<HTMLElement>(null);
  const plan = plans.find((item) => item.floorNumber === activeFloorNumber) ?? plans[0];
  const rooms: readonly RoomView[] = useDemoAssets ? demoRooms : (plan?.rooms ?? []);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const previewRoom = rooms.find((room) => room.id === previewRoomId);
  const activeRoom = previewRoom ?? selectedRoom;
  const roomAnnouncement = useMemo(
    () =>
      selectedRoom
        ? `${selectedRoom.name}, ${selectedRoom.size}, ${selectedRoom.areaSqFt === null ? "area to be confirmed" : `${selectedRoom.areaSqFt} square feet`}`
        : "No room selected",
    [selectedRoom],
  );

  const changeFloor = (floorNumber: number) => {
    setActiveFloorNumber(floorNumber);
    setSelectedRoomId(undefined);
    setPreviewRoomId(undefined);
    setDemoRooms([]);
  };

  const closeRoomDetails = useCallback(() => {
    const target = Array.from(
      planRef.current?.querySelectorAll<SVGGElement>(".sg-room, .room-group") ?? [],
    ).find((room) => (room.dataset.roomId ?? room.dataset.room) === selectedRoomId);
    setSelectedRoomId(undefined);
    target?.focus();
  }, [selectedRoomId]);

  useMobileFocusTrap({
    open: Boolean(selectedRoomId),
    containerRef: roomPanelRef,
    onClose: closeRoomDetails,
  });

  return (
    <section className="sg-plan-section" aria-labelledby="sg-plan-heading">
      <div className="sg-plan-intro">
        <div>
          <p className="sg-eyebrow">Explore the layout</p>
          <h2 id="sg-plan-heading">Floor plans</h2>
        </div>
        <p className="sg-plan-status">
          {villa.status === "available"
            ? "For exploration · booking is not active"
            : "View only · this villa is not available to book"}
        </p>
      </div>

      <div className="sg-plan-toolbar">
        <div className="sg-floor-tabs" role="group" aria-label="Choose a floor">
          {plans.map((floor) => (
            <button
              key={floor.floorNumber}
              aria-pressed={activeFloorNumber === floor.floorNumber}
              className="sg-floor-tab"
              onClick={() => changeFloor(floor.floorNumber)}
              type="button"
            >
              {floor.label}
            </button>
          ))}
        </div>
        <span className="sg-plan-caption">
          {useDemoAssets
            ? "Demo plan from supplied SVG · schematic, not an approved drawing"
            : "Placeholder layout · Room sizes and areas to be confirmed"}
        </span>
      </div>

      {plan ? (
        <div className="sg-plan-layout">
          <div className="sg-plan-canvas" ref={planRef} aria-describedby="sg-plan-description">
            {useDemoAssets ? (
              <AssetFloorPlan
                floor={activeFloorNumber === 0 ? "ground" : "first"}
                selectedRoomId={selectedRoomId}
                onSelect={(room) => {
                  setSelectedRoomId(room.id);
                  setPreviewRoomId(undefined);
                }}
                onPreview={(room) => setPreviewRoomId(room?.id)}
                onRooms={setDemoRooms}
              />
            ) : (
              <svg
                aria-describedby="sg-plan-description"
                aria-label={`${plan.label} placeholder for villa ${villa.id}. Select a room for placeholder size and area details.`}
                className="sg-floor-plan"
                role="group"
                viewBox="0 0 720 540"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect className="sg-plan-outline" x="45" y="25" width="635" height="470" rx="4" />
                {plan.rooms.map((room) => (
                  <RoomShape
                    key={room.id}
                    room={room}
                    active={activeRoom?.id === room.id}
                    onPreview={(target) => setPreviewRoomId(target.id)}
                    onClearPreview={(id) =>
                      setPreviewRoomId((current) => (current === id ? undefined : current))
                    }
                    onSelect={(target) => {
                      setSelectedRoomId(target.id);
                      setPreviewRoomId(undefined);
                    }}
                  />
                ))}
                <text className="sg-plan-road-label" x="360" y="514">
                  FRONT / ROAD SIDE
                </text>
              </svg>
            )}
            <p id="sg-plan-description" className="sg-visually-hidden">
              Complete placeholder room layout for exploration only. It is not an approved
              architectural or construction drawing.
            </p>
          </div>

          <aside
            ref={roomPanelRef}
            className={`sg-room-panel${selectedRoomId ? " is-open" : ""}`}
            aria-label="Room details"
            tabIndex={-1}
          >
            <div className="sg-room-panel__topline">
              <span>Room information</span>
              <span>{activeRoom ? "Selected" : "—"}</span>
              {selectedRoomId ? (
                <button className="sg-sheet-close" type="button" onClick={closeRoomDetails}>
                  Close room details
                </button>
              ) : null}
            </div>
            {activeRoom ? (
              <>
                <p className="sg-eyebrow">{plan.label}</p>
                <h3>{activeRoom.name}</h3>
                <dl className="sg-room-facts">
                  <div>
                    <dt>Room size</dt>
                    <dd>{activeRoom.size}</dd>
                  </div>
                  <div>
                    <dt>Area</dt>
                    <dd>
                      {activeRoom.areaSqFt === null
                        ? "To be confirmed"
                        : `${activeRoom.areaSqFt} sq.ft`}
                    </dd>
                  </div>
                  <div>
                    <dt>Floor</dt>
                    <dd>{plan.label}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="sg-room-panel__empty">
                <h3>Select a room</h3>
                <p>Room size and area appear here.</p>
                <dl className="sg-room-facts">
                  <div>
                    <dt>Floor</dt>
                    <dd>{plan.label}</dd>
                  </div>
                </dl>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="sg-plan-unavailable">
          <h3>Plan coming soon</h3>
        </div>
      )}

      {plan ? (
        <details className="sg-room-picker">
          <summary>Browse rooms by name</summary>
          <div className="sg-room-picker__grid">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                aria-pressed={room.id === selectedRoomId}
                onClick={() => {
                  setSelectedRoomId(room.id);
                  setPreviewRoomId(undefined);
                }}
              >
                {room.name} <span>{room.size}</span>
              </button>
            ))}
          </div>
        </details>
      ) : null}

      <p className="sg-sample-disclaimer" role="note">
        {useDemoAssets
          ? "Demo floor plans use the supplied schematic SVG assets. Room positions, dimensions and specifications are samples and need architect approval before publication."
          : "Complete placeholder room layouts are shown for both floors. Room positions, dimensions and specifications need architect approval before publication."}
      </p>
      <p className="sg-visually-hidden" role="status" aria-live="polite">
        {roomAnnouncement}
      </p>
    </section>
  );
}
