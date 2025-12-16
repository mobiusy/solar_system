# Solar System High-Accuracy 3D Simulator

## 1. Overview

### 1.1 Project Background

This project is a **browser-based high-accuracy 3D simulator of the Solar System**. It uses **NASA planetary orbital parameters** together with the **three.js** 3D rendering engine to visualize:

- The Sun, eight major planets, and the Moon
- Elliptical orbits and orbital periods approximated by Keplerian motion
- Planetary sizes, axial tilts, and basic physical parameters

The goal is to provide an **interactive, teaching-oriented visualization tool** that balances physical correctness and real‑time performance.

### 1.2 Main Features

- **3D orbital visualization**: Realistic elliptical orbits of the Sun–planet–Moon system based on NASA data.
- **Time control**: Adjustable simulation time scale, including slowdown, pause, fast‑forward, and reverse playback.
- **Orbit controls**: Toggle orbit visibility and adjust visual orbit scaling independently from physical parameters.
- **Follow camera**: Automatically follow a selected celestial body.
- **Earth day/night view**: Switch between daytime and nighttime textures of the Earth.
- **Size mapping modes**: Switch between **logarithmic** and **real** radius mapping to balance visibility and realism.
- **Lighting modes**:
  - `Teaching` mode: Emphasizes surface details via emissive maps.
  - `Realistic` mode: Approximate real lighting with stronger contrast.

The UI language in `index.html` is currently **Chinese (Simplified)**, but the code and architecture are suitable for internationalization.

---

## 2. Tech Stack

### 2.1 Frontend

- **Core library**: [`three`](https://threejs.org/) `0.161.0`, loaded via CDN as ES modules (`index.html:363-373`)
- **Rendering**: `THREE.WebGLRenderer`, `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.Points`, etc. (`app.js:1-150`)
- **Camera interaction**: `OrbitControls` from `three/examples/jsm/controls/OrbitControls.js` (`app.js:2`)
- **Data layer**: Static orbital and physical parameters in `ORBIT_DATA` and scaling constants in `VISUAL_SCALE` (`orbit-data.js:1-147`)

The frontend no longer depends on a local `node_modules` directory, and you do not need `npm install` to obtain `three`; all three.js modules are served directly from the CDN.

### 2.2 Helper Scripts

- **Python 3**:
  - `serve.py`: Simple HTTP server with correct JavaScript MIME configuration, serving the project at `http://localhost:4175/` (`serve.py:1-23`).

### 2.3 Runtime Environment

- Modern desktop browser with WebGL support (Chrome, Edge, Firefox, or equivalent)
- Python 3.x (for helper scripts)

---

## 3. Requirements and Dependencies

### 3.1 System Requirements

| Component       | Recommended Version               | Notes                                       |
|----------------|-----------------------------------|---------------------------------------------|
| OS             | Windows / macOS / Linux           | Any system that can run Python + a browser  |
| Browser        | Latest Chrome / Edge / Firefox    | Must support WebGL                          |
| Node.js        | ≥ 18 (LTS recommended)            | Optional; used to manage `three` dependency |
| Python         | ≥ 3.8                             | Used by helper scripts in this repo         |

### 3.2 Project Dependencies

- **Frontend dependencies**:
  - three.js loaded from a CDN, currently version `0.161.0` (`index.html:363-373`)
- **Python standard library only**:
  - `http.server`, `socketserver`, `mimetypes` (`serve.py:1-12`)

This project no longer contains a `package.json` file or any `npm` scripts. There are no automated test commands; for basic verification you can open the app in a browser and optionally run `SolarSystemTest.runAll()` from the console (`app.js:911-1004`).

---

## 4. Installation and Deployment

The repository already contains a complete `textures/` directory. In most cases, you only need to perform the following steps to run the project.

### 4.1 Clone the Repository

```bash
git clone git@github.com:mobiusy/solar_system.git
cd solar_system
```

### 4.2 Start the Local HTTP Server

To ensure correct MIME types for `.js` and `.mjs` files, use the bundled Python server:

```bash
python serve.py
```

You should see output similar to:

```text
Serving HTTP on 0.0.0.0 port 4175 (http://localhost:4175/) ...
```

Then open the following URL in your browser:

- `http://localhost:4175/`

The 3D Solar System scene and control panel should load automatically.

---

## 5. Usage and Examples

### 5.1 Basic Interaction

- **Rotate view**: Left mouse button drag
- **Zoom in/out**: Mouse wheel scroll
- **Pan view**: Right mouse button drag
- **Select body**: Click a planet or the Moon to update the information panel on the right

These operations are handled via `OrbitControls` and raycasting logic in `app.js` (`app.js:1-120`, `app.js:400-520`).

### 5.2 Control Panel

The control panel on the right (defined in `index.html:247-355`) exposes several interactive controls:

| Control             | Element ID         | Function                                                                 |
|---------------------|--------------------|--------------------------------------------------------------------------|
| Time scale          | `time-scale`       | Adjusts simulation speed; label `time-scale-label` shows the multiplier  |
| Orbit visibility    | `toggle-orbits`    | Show/hide all orbit lines                                                |
| Orbit scale         | `orbit-scale`      | Visually scales orbit radii without changing underlying physics          |
| Auto-follow target  | `follow-target`    | Camera smoothly follows the selected body                                |
| Earth view toggle   | `earth-view-toggle`| Switches between Earth daytime and nighttime textures                    |
| Size mapping mode   | `size-mode`        | `log` vs `real` radius mapping                                           |
| Lighting mode       | `lighting-mode`    | `teaching` vs `real` lighting presets                                    |

All elements are bound and managed in `app.js` (`app.js:23-76`, `app.js:520-789`).

### 5.3 Time Scale Usage Example

The time scale slider maps exponential steps to actual simulation speed (`app.js:90-120`):

- Set slider to center (0): real‑time baseline
- Move to the right: increase simulation speed (years pass in seconds)
- Move to the left: slow down or even reverse time (negative values)

Example workflow:

1. Start the server (`python serve.py`).
2. Open the page and locate the **time scale** slider.
3. Drag it to the right to accelerate orbital motion.
4. Drag left into the negative range to see orbits running backwards.

---

## 6. Contributing

### 6.1 Code Style and Principles

- **No comments rule in this environment**: When contributing here, avoid adding inline comments unless explicitly requested.
- **Prefer clarity over cleverness**: Use descriptive variable and function names.
- **Data-driven configuration**: Put orbital and physical parameters into `orbit-data.js` instead of hardcoding them inside rendering code.
- **No secrets in code**: Do not include API keys, tokens, or other secrets in this repository.

### 6.2 Suggested Contribution Areas

- Improving physical accuracy (e.g., adding more moons, refining orbital elements).
- Enhancing visualization (e.g., starfield, labels, trails).
- Adding internationalization / localization support for the UI text in `index.html`.
- Implementing automated tests (e.g., using a headless browser or unit tests for math utilities).

### 6.3 Contribution Workflow

1. **Fork** the repository.
2. **Create a feature branch**:

   ```bash
   git checkout -b feature/my-improvement
   ```

3. **Make changes** and ensure the simulator still runs:

   - `python serve.py`
   - Open `http://localhost:4175/`

4. **Commit** with a clear message and open a **pull request** describing:

   - What you changed
   - Why it is useful
   - Any impact on performance or behavior

---

## 7. License

This project’s source code is licensed under the **ISC License**.

In summary, the ISC License:

- Allows use, copying, modification, and distribution of the software for any purpose.
- Requires preservation of the copyright notice.
- Provides the software **“as is”** without warranty.

If you add external assets or libraries, make sure their licenses are compatible with ISC and properly attributed where required.
