# Spectra Gardens floor-plan SVG assets

This package contains two standalone, scalable SVG floor-plan assets:

- `spectra-ground-floor-plan.svg`
- `spectra-first-floor-plan.svg`

The room positions, labels and stated room sizes are taken from the V3.4 prototype's `ROOM_DATA`. They remain schematic UI floorplans, not construction drawings or dimensionally surveyed plans.

## Use as an SVG image

```html
<img
  src="/assets/spectra-ground-floor-plan.svg"
  alt="Villa ground floor plan"
  class="floor-svg"
/>
```

For the first floor, change the source to `/assets/spectra-first-floor-plan.svg`.

## Preserve clickable room selection

The SVG includes room groups with `data-room`, `tabindex`, `role="button"` and accessible labels. To keep the prototype's existing room-detail panel working, fetch the SVG and insert its SVG markup inline rather than using an `<img>` element:

```js
async function loadFloorPlan(floor) {
  const file = floor === 'ground'
    ? '/assets/spectra-ground-floor-plan.svg'
    : '/assets/spectra-first-floor-plan.svg';

  const response = await fetch(file);
  if (!response.ok) {
    throw new Error(`Could not load floor plan: ${response.status}`);
  }

  const svgText = await response.text();
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) {
    throw new Error('The floor-plan SVG is not valid XML.');
  }

  const svg = document.importNode(parsed.documentElement, true);
  svg.id = 'floorPlan';
  svg.classList.add('floor-svg');
  document.querySelector('#floorPlan').replaceWith(svg);

  const selectRoom = (room) => {
    activeRoom = room.dataset.room;
    svg.querySelectorAll('.room-group').forEach((item) => {
      item.classList.toggle('active', item === room);
    });
    renderRoom(activeRoom); // Uses the existing ROOM_DATA and room-detail panel.
  };

  svg.querySelectorAll('.room-group').forEach((room) => {
    room.addEventListener('click', () => selectRoom(room));
    room.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectRoom(room);
      }
    });
  });
}
```

Call `loadFloorPlan(activeFloor)` whenever the user opens the villa or switches between the Ground floor and First floor tabs. Keep the current `ROOM_DATA` object for the room-detail panel; the SVG's `data-room` attributes map to those room IDs.

If you use inline SVG, retain the SVG `viewBox` so it scales responsively. The room detail data can continue to come from the prototype's `ROOM_DATA` object.

## Moolaparambu site plan

`moolaparambu-site-plan.svg` and `moolaparambu-site-plan-preview.png` replace the demo villa floor plan on the villa detail page. The SVG traces the six-plot subdivision plan, its internal access road and the southern approach; the PNG is a static fallback when the inline SVG cannot be loaded.

The SVG contains its own `<script>` for plot selection. `asset-site-plan.tsx` removes executable content before inserting the SVG inline, keeps its `<style>` for the traced linework, and handles plot selection from React. Plot groups carry `data-plot` and accessible labels such as "Plot 3, 16.10 cent". Areas and dimensions are reproduced as printed in the source drawing.
