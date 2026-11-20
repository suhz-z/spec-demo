"use client";

import { useEffect, useRef, useState } from "react";

export type DemoRoom = {
  id: string;
  name: string;
  size: string;
  areaSqFt: number | null;
  service: boolean;
  outside: boolean;
};

type AssetFloorPlanProps = {
  floor: "ground" | "first";
  selectedRoomId?: string;
  onSelect: (room: DemoRoom) => void;
  onPreview: (room: DemoRoom | null) => void;
  onRooms: (rooms: DemoRoom[]) => void;
};

function parseRooms(root: Element): DemoRoom[] {
  return Array.from(root.querySelectorAll<SVGGElement>("[data-room]")).flatMap((group) => {
    const id = group.getAttribute("data-room");
    if (!id) return [];
    const [name = id, size = "To be confirmed", areaText = ""] = (
      group.getAttribute("aria-label") ?? ""
    )
      .split(",")
      .map((part) => part.trim());
    const parsedArea = Number.parseInt(areaText.replace(/\D/g, ""), 10);
    const shape = group.querySelector("rect");
    return [
      {
        id,
        name,
        size,
        areaSqFt: Number.isFinite(parsedArea) ? parsedArea : null,
        service: shape?.classList.contains("service") ?? false,
        outside: shape?.classList.contains("outside") ?? false,
      },
    ];
  });
}

function roomFrom(group: Element, rooms: DemoRoom[]): DemoRoom | null {
  const id = group.getAttribute("data-room");
  return rooms.find((room) => room.id === id) ?? null;
}

/**
 * Loads one of the supplied schematic SVG floor plans from /public and keeps
 * its room groups keyboard- and pointer-selectable. The asset is first-party
 * and validated before insertion; its internal <style> is removed so the
 * scoped .sg-demo-plan rules in globals.css control the visual treatment.
 */
export function AssetFloorPlan({
  floor,
  selectedRoomId,
  onSelect,
  onPreview,
  onRooms,
}: AssetFloorPlanProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<DemoRoom[]>([]);
  const callbacks = useRef({ onSelect, onPreview, onRooms });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    callbacks.current = { onSelect, onPreview, onRooms };
  }, [onSelect, onPreview, onRooms]);

  useEffect(() => {
    let cancelled = false;
    let detachListeners: (() => void) | undefined;
    const currentHost = hostRef.current;
    if (!currentHost) return;
    const container: HTMLDivElement = currentHost;

    async function load() {
      setStatus("loading");
      container.replaceChildren();
      try {
        const response = await fetch(`/spectra-${floor}-floor-plan.svg`, { cache: "force-cache" });
        if (!response.ok) throw new Error(`plan request failed: ${response.status}`);
        const text = await response.text();
        if (/<script|\son[a-z]+\s*=/i.test(text)) throw new Error("unsafe plan asset");
        const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
        if (parsed.querySelector("parsererror")) throw new Error("invalid plan asset");
        if (cancelled) return;

        const svg = parsed.documentElement;
        svg.querySelector("style")?.remove();
        const rooms = parseRooms(svg);
        roomsRef.current = rooms;
        container.replaceChildren(svg);
        callbacks.current.onRooms(rooms);

        const closestRoom = (target: EventTarget | null): Element | null =>
          target instanceof Element ? target.closest("[data-room]") : null;
        const handleClick = (event: MouseEvent) => {
          const group = closestRoom(event.target);
          const room = group ? roomFrom(group, roomsRef.current) : null;
          if (room) callbacks.current.onSelect(room);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const group = closestRoom(event.target);
          if (!group) return;
          event.preventDefault();
          const room = roomFrom(group, roomsRef.current);
          if (room) callbacks.current.onSelect(room);
        };
        const handlePreview = (event: FocusEvent | PointerEvent) => {
          const group = closestRoom(event.target);
          callbacks.current.onPreview(group ? roomFrom(group, roomsRef.current) : null);
        };

        container.addEventListener("click", handleClick);
        container.addEventListener("keydown", handleKeyDown);
        container.addEventListener("focusin", handlePreview);
        container.addEventListener("focusout", handlePreview);
        container.addEventListener("pointerover", handlePreview);
        container.addEventListener("pointerout", handlePreview);
        detachListeners = () => {
          container.removeEventListener("click", handleClick);
          container.removeEventListener("keydown", handleKeyDown);
          container.removeEventListener("focusin", handlePreview);
          container.removeEventListener("focusout", handlePreview);
          container.removeEventListener("pointerover", handlePreview);
          container.removeEventListener("pointerout", handlePreview);
        };
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
      detachListeners?.();
    };
  }, [floor]);

  useEffect(() => {
    const container = hostRef.current;
    if (!container || status !== "ready") return;
    container.querySelectorAll("[data-room]").forEach((group) => {
      group.classList.toggle("active", group.getAttribute("data-room") === selectedRoomId);
    });
  }, [selectedRoomId, status]);

  return (
    <>
      {/* React must not own children here: the validated SVG is inserted with DOM APIs. */}
      <div className="sg-demo-plan" ref={hostRef} />
      {status === "loading" ? <p className="sg-plan-loading">Loading demo floor plan…</p> : null}
      {status === "error" ? (
        <p className="sg-plan-loading" role="status">
          The demo floor plan could not be loaded. The interactive placeholder plan is unavailable.
        </p>
      ) : null}
    </>
  );
}
