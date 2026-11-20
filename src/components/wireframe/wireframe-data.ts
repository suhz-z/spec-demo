/** Development fixture data ported verbatim from docs/spectra-wireframe-v3.4.html. */
export type VillaStatus = "available" | "reserved" | "booked";
export type VillaType = "3BHK" | "4BHK";

export type Villa = {
  id: string;
  type: VillaType;
  builtUp: number;
  plot: number;
  floors: string;
  corner: boolean;
  facing: string;
  basic: number;
  price: number;
  status: VillaStatus;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const TYPE: Record<VillaType, { label: string; builtUp: number; floors: string }> = {
  "3BHK": { label: "3 BHK", builtUp: 2450, floors: "Ground + 1" },
  "4BHK": { label: "4 BHK", builtUp: 2900, floors: "Ground + 1" },
};

const BOOKED = ["A-02", "A-05", "A-09", "B-03", "C-06", "C-02", "D-01", "D-08"];
const RESERVED = ["A-06", "B-07", "C-05", "D-04"];

export const VILLAS: Villa[] = [];

function addRow(
  prefix: string,
  start: number,
  count: number,
  x0: number,
  step: number,
  w: number,
  y: number,
  h: number,
  type: VillaType,
  facing: string,
) {
  for (let i = 0; i < count; i += 1) {
    const n = start + i;
    const id = `${prefix}-${String(n).padStart(2, "0")}`;
    const corner = i === 0 || i === count - 1;
    const vary = ((n * 137 + prefix.charCodeAt(0) * 7) % 5) * 70;
    const plot = (type === "4BHK" ? 3200 : 2500) + vary + (corner ? 300 : 0);
    const builtUp = TYPE[type].builtUp;
    const basic = Math.round((builtUp * 5000 + plot * 1800) / 10000) * 10000;
    VILLAS.push({
      id,
      type,
      builtUp,
      plot,
      floors: TYPE[type].floors,
      corner,
      facing,
      basic,
      price: basic + (corner ? 350000 : 0),
      status: BOOKED.includes(id) ? "booked" : RESERVED.includes(id) ? "reserved" : "available",
      x: x0 + i * step,
      y,
      w,
      h,
    });
  }
}

addRow("A", 1, 10, 44, 92, 84, 40, 140, "4BHK", "South");
addRow("B", 1, 4, 44, 86, 78, 230, 96, "4BHK", "North");
addRow("B", 5, 4, 44, 86, 78, 336, 96, "3BHK", "South");
addRow("C", 1, 4, 620, 86, 78, 230, 96, "4BHK", "North");
addRow("C", 5, 4, 620, 86, 78, 336, 96, "3BHK", "South");
addRow("D", 1, 5, 44, 84, 76, 490, 140, "3BHK", "North");
addRow("D", 6, 5, 544, 84, 76, 490, 140, "3BHK", "North");

export type Room = {
  id: string;
  name: string;
  size: string;
  area: string;
  x: number;
  y: number;
  w: number;
  h: number;
  service?: boolean;
  outside?: boolean;
};

export const ROOM_DATA: Record<"ground" | "first", readonly Room[]> = {
  ground: [
    {
      id: "kitchen",
      name: "Kitchen",
      size: "13′ × 12′",
      area: "156 sq.ft",
      x: 70,
      y: 48,
      w: 178,
      h: 130,
    },
    {
      id: "work",
      name: "Work area",
      size: "7′ × 12′",
      area: "84 sq.ft",
      x: 248,
      y: 48,
      w: 96,
      h: 130,
      service: true,
    },
    {
      id: "bed1",
      name: "Bedroom 1",
      size: "13′ × 12′",
      area: "156 sq.ft",
      x: 344,
      y: 48,
      w: 178,
      h: 130,
    },
    {
      id: "bath1",
      name: "Bath 1",
      size: "7′ × 12′",
      area: "84 sq.ft",
      x: 522,
      y: 48,
      w: 96,
      h: 130,
      service: true,
    },
    {
      id: "dining",
      name: "Dining",
      size: "14′ × 10′",
      area: "140 sq.ft",
      x: 70,
      y: 178,
      w: 190,
      h: 108,
    },
    {
      id: "living",
      name: "Living room",
      size: "18′ × 18′",
      area: "324 sq.ft",
      x: 260,
      y: 178,
      w: 240,
      h: 194,
    },
    {
      id: "study",
      name: "Study",
      size: "8′ × 9′",
      area: "72 sq.ft",
      x: 500,
      y: 178,
      w: 118,
      h: 97,
    },
    {
      id: "toilet",
      name: "Common toilet",
      size: "8′ × 9′",
      area: "72 sq.ft",
      x: 500,
      y: 275,
      w: 118,
      h: 97,
      service: true,
    },
    {
      id: "stair",
      name: "Staircase",
      size: "8′ × 8′",
      area: "64 sq.ft",
      x: 70,
      y: 286,
      w: 105,
      h: 86,
      service: true,
    },
    {
      id: "foyer",
      name: "Foyer",
      size: "6′ × 8′",
      area: "48 sq.ft",
      x: 175,
      y: 286,
      w: 85,
      h: 86,
      service: true,
    },
    {
      id: "sitout",
      name: "Sit-out",
      size: "14′ × 6′",
      area: "84 sq.ft",
      x: 175,
      y: 372,
      w: 190,
      h: 55,
      outside: true,
    },
    {
      id: "porch",
      name: "Car porch",
      size: "16′ × 16′",
      area: "256 sq.ft",
      x: 405,
      y: 372,
      w: 213,
      h: 110,
      outside: true,
    },
  ],
  first: [
    {
      id: "master",
      name: "Master bedroom",
      size: "16′ × 14′",
      area: "224 sq.ft",
      x: 70,
      y: 48,
      w: 218,
      h: 150,
    },
    {
      id: "wardrobe",
      name: "Walk-in",
      size: "6′ × 7′",
      area: "42 sq.ft",
      x: 288,
      y: 48,
      w: 105,
      h: 75,
      service: true,
    },
    {
      id: "mbath",
      name: "Master bath",
      size: "6′ × 7′",
      area: "42 sq.ft",
      x: 288,
      y: 123,
      w: 105,
      h: 75,
      service: true,
    },
    {
      id: "bed2",
      name: "Bedroom 2",
      size: "12′ × 14′",
      area: "168 sq.ft",
      x: 393,
      y: 48,
      w: 165,
      h: 150,
    },
    {
      id: "bath2",
      name: "Bath 2",
      size: "6′ × 14′",
      area: "84 sq.ft",
      x: 558,
      y: 48,
      w: 95,
      h: 150,
      service: true,
    },
    {
      id: "store",
      name: "Linen store",
      size: "8′ × 8′",
      area: "64 sq.ft",
      x: 70,
      y: 198,
      w: 110,
      h: 86,
      service: true,
    },
    {
      id: "stair2",
      name: "Staircase",
      size: "8′ × 8′",
      area: "64 sq.ft",
      x: 70,
      y: 284,
      w: 110,
      h: 86,
      service: true,
    },
    {
      id: "lounge",
      name: "Family lounge",
      size: "22′ × 16′",
      area: "352 sq.ft",
      x: 180,
      y: 198,
      w: 270,
      h: 172,
    },
    {
      id: "office",
      name: "Home office",
      size: "10′ × 16′",
      area: "160 sq.ft",
      x: 450,
      y: 198,
      w: 203,
      h: 172,
    },
    {
      id: "balcony",
      name: "Balcony",
      size: "22′ × 5′",
      area: "110 sq.ft",
      x: 180,
      y: 370,
      w: 270,
      h: 55,
      outside: true,
    },
  ],
};

export const moneyCr = (value: number) => `₹${(value / 1e7).toFixed(2)} Cr`;
export const sqft = (value: number) => `${Math.round(value).toLocaleString("en-IN")} sq.ft`;

export function mapSVG(options: {
  activeType: "all" | VillaType;
  availableOnly: boolean;
  selected: string | null;
  villas: readonly Villa[];
}): string {
  const { activeType, availableOnly, selected, villas } = options;
  let s = `<rect x="8" y="8" width="984" height="664" rx="10" class="site-outline"/><rect x="392" y="226" width="216" height="218" rx="8" class="landscape"/><rect x="460" y="484" width="80" height="188" class="landscape"/>`;
  s += `<rect x="16" y="190" width="968" height="30" class="road"/><line x1="24" y1="205" x2="976" y2="205" class="road-mark"/><rect x="16" y="450" width="968" height="30" class="road"/><line x1="24" y1="465" x2="976" y2="465" class="road-mark"/><rect x="470" y="480" width="60" height="192" class="road"/><line x1="500" y1="486" x2="500" y2="668" class="road-mark"/>`;
  s += `<rect x="404" y="236" width="192" height="80" rx="6" class="amenity"/><text x="500" y="272" class="map-label">Clubhouse</text><text x="500" y="292" class="map-small">GYM · HALL · CAFE</text><rect x="424" y="330" width="152" height="56" rx="28" class="pool"/><text x="500" y="363" class="map-label">Pool</text><rect x="404" y="398" width="88" height="38" rx="6" class="amenity"/><text x="448" y="422" class="map-small">PLAY AREA</text><rect x="500" y="398" width="96" height="38" rx="6" class="amenity"/><text x="548" y="422" class="map-small">YOGA LAWN</text>`;
  s += `<text x="300" y="210" class="map-small">ROAD 1 · 9 M</text><text x="700" y="210" class="map-small">ROAD 1 · 9 M</text><text x="300" y="470" class="map-small">ROAD 2 · 9 M</text><text x="700" y="470" class="map-small">ROAD 2 · 9 M</text><text x="500" y="560" class="map-small" transform="rotate(-90 500 560)">ENTRY ROAD · 12 M</text><text x="500" y="656" class="map-small" style="fill:#527e5c">MAIN GATE</text>`;
  const trees: number[][] = [];
  for (let y = 500; y <= 640; y += 28) trees.push([464, y], [536, y]);
  [
    [410, 244],
    [596, 244],
    [402, 320],
    [598, 320],
    [402, 392],
    [598, 392],
  ].forEach((tree) => trees.push(tree));
  for (let x = 40; x <= 960; x += 46) trees.push([x, 24]);
  for (let x = 40; x <= 440; x += 46) trees.push([x, 652]);
  for (let x = 560; x <= 960; x += 46) trees.push([x, 652]);
  s += trees.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" class="tree"/>`).join("");
  villas.forEach((villa) => {
    const dim =
      (activeType !== "all" && villa.type !== activeType) ||
      (availableOnly && villa.status !== "available");
    const classes = [
      "plot",
      villa.status,
      dim ? "dim" : "",
      selected === villa.id ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const label = `Villa ${villa.id}, ${TYPE[villa.type].label}, ${villa.status}`;
    s += `<g class="${classes}" data-id="${villa.id}" tabindex="0" role="button" aria-label="${label}"><rect x="${villa.x}" y="${villa.y}" width="${villa.w}" height="${villa.h}"/><text x="${villa.x + villa.w / 2}" y="${villa.y + villa.h / 2}">${villa.id}</text></g>`;
  });
  return s;
}

export function drawFloor(floor: "ground" | "first", activeRoom: string | null): string {
  const rooms = ROOM_DATA[floor];
  let s =
    '<rect x="45" y="25" width="635" height="470" rx="4" fill="#f5f7f2" stroke="#dfe6dc" stroke-width="1.5"/>';
  rooms.forEach((room) => {
    const classes = ["room-group", activeRoom === room.id ? "active" : ""].join(" ");
    const shape = ["room-shape", room.service ? "service" : "", room.outside ? "outside" : ""]
      .filter(Boolean)
      .join(" ");
    s += `<g class="${classes}" data-room="${room.id}" tabindex="0" role="button" aria-label="${room.name}, ${room.size}"><rect class="${shape}" x="${room.x}" y="${room.y}" width="${room.w}" height="${room.h}"/><text class="room-name" x="${room.x + room.w / 2}" y="${room.y + room.h / 2 - 4}">${room.name}</text><text class="room-size" x="${room.x + room.w / 2}" y="${room.y + room.h / 2 + 15}">${room.size}</text></g>`;
  });
  s +=
    '<text x="360" y="514" text-anchor="middle" fill="#8b978d" font-family="Inter, sans-serif" font-size="10" letter-spacing="1.5">FRONT / ROAD SIDE</text>';
  return s;
}
