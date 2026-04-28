# Tiny Tamer

Tiny Tamer is a complete playable browser game prototype built with Vite, Three.js, plain JavaScript, HTML, and CSS.

Explore a cozy low-poly 3D island, wander through tall grass, encounter original tiny creatures, battle them, catch them, and save your collection locally in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

## Features

- Top-down/isometric Three.js island exploration
- Smooth WASD / arrow-key movement
- Low-poly ground, grass, trees, rocks, flowers, lighting, shadows, and camera follow
- Random creature encounters in tall grass patches
- Battle overlay with Attack, Catch, and Run actions
- Six original creatures with names, stats, colors, and descriptions
- Captured creature collection saved with localStorage
- Toggleable collection panel and polished cozy UI

## Project structure

```text
src/
  main.js
  style.css
  world/
    createScene.js
    createWorld.js
    player.js
    input.js
    encounters.js
  battle/
    creatures.js
    battleSystem.js
  storage/
    save.js
  ui/
    hud.js
```
