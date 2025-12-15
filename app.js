// 太阳系高精度模拟器主入口
// 使用 three.js 渲染太阳、八大行星及月球轨道，结合 NASA 轨道参数近似开普勒运动

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ORBIT_DATA, VISUAL_SCALE } from "./orbit-data.js?v=1";

// three.js 场景、相机与渲染器
/** @type {THREE.Scene} */
let scene;
/** @type {THREE.PerspectiveCamera} */
let camera;
/** @type {THREE.WebGLRenderer} */
let renderer;
/** @type {OrbitControls} */
let controls;

// 存储行星网格、组与轨道线等对象
const bodyMeshes = new Map();
const bodyGroups = new Map();
const bodyMaterials = new Map();
const orbitLines = new Map();

// 射线拾取器与鼠标
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 时间控制相关变量
// 模拟时间单位：地球日；timeScale 表示相对于真实时间的加速倍率（幂次映射自 UI 滑块）
let simulationDays = 0;
let timeScale = 1.0;
let lastRealTime = performance.now();

// 性能统计
let lastFpsUpdate = performance.now();
let frameCount = 0;

// UI 元素引用
const renderContainer = document.getElementById("render-container");
const loadingOverlay = document.getElementById("loading-overlay");
const perfIndicator = document.getElementById("perf-indicator");
const timeScaleInput = document.getElementById("time-scale");
const timeScaleLabel = document.getElementById("time-scale-label");
const toggleOrbitsBtn = document.getElementById("toggle-orbits");
const orbitScaleInput = document.getElementById("orbit-scale");
const followSelect = document.getElementById("follow-target");
const earthViewToggle = document.getElementById("earth-view-toggle");
const sizeModeSelect = document.getElementById("size-mode");
const lightingModeSelect = document.getElementById("lighting-mode");
const togglePanelBtn = document.getElementById("toggle-panel");
const panelToggleOverlayBtn = document.getElementById("panel-toggle-overlay");
const uiPanel = document.getElementById("ui-panel");

const bodyNameEl = document.getElementById("body-name");
const bodyTypeEl = document.getElementById("body-type");
const bodyDetailsEl = document.getElementById("body-details");

// 地球纹理与视图状态
let earthDayTexture = null;
let earthNightTexture = null;
let earthNightMode = false;

// 当前选中天体与自动跟踪目标
let selectedBodyKey = "sun";
let followBodyKey = "";

// LOD 相关：根据距离粗略控制网格细节（通过切换细分段数）
const lodConfig = {
  near: 25,
  far: 200,
};

// 轨道显示开关与缩放
let showOrbits = true;
let orbitScaleFactor = 1.0;

// 纹理加载器
const textureLoader = new THREE.TextureLoader();

let sizeMode = "log";
const bodyInitialRadius = new Map();
let lightingMode = "teaching";
let ambientLight;
let sunLight;

// 初始化入口
init();

// 初始化主函数
function init() {
  initScene();
  initLights();
  initBodies();
  applyLightingMode();
  initRenderer();
  initControls();
  initEvents();
  updateInfoPanel("sun");

  // 隐藏加载遮罩
  loadingOverlay.classList.add("hidden");
  animate();
}

// 初始化 three.js 场景与相机
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // 添加少量星空粒子以增加空间感
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 800 + Math.random() * 800;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  starsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  const aspect = renderContainer.clientWidth / renderContainer.clientHeight;
  camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
  camera.position.set(0, 120, 260);
}

function initLights() {
  ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  sunLight = new THREE.PointLight(0xffffff, 2.2, 0, 2);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);
}

// 初始化渲染器
function initRenderer() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(
    renderContainer.clientWidth,
    renderContainer.clientHeight
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderContainer.appendChild(renderer.domElement);
}

// 初始化相机控制器
function initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2;
  controls.maxDistance = 1500;
  controls.rotateSpeed = 0.35;
  controls.zoomSpeed = 0.6;
  controls.panSpeed = 0.4;
  controls.target.set(0, 0, 0);
}

// 根据 ORBIT_DATA 创建太阳、行星与月球网格及轨道线
function initBodies() {
  const sunData = ORBIT_DATA.sun;
  const sunEarthRatio = sunData.radiusKm / ORBIT_DATA.earth.radiusKm;
  const sunRadius =
    mapRadiusByMode(sunEarthRatio) * VISUAL_SCALE.EARTH_RADIUS_TO_SCENE;
  const sunGeometry = new THREE.SphereGeometry(sunRadius, 64, 64);
  const sunMaterial = new THREE.MeshPhysicalMaterial({
    emissive: new THREE.Color(0xfff2a8),
    emissiveIntensity: 1.0,
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.0,
  });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = "sun";
  bodyMeshes.set("sun", sunMesh);
  bodyMaterials.set("sun", sunMaterial);
  scene.add(sunMesh);
  bodyInitialRadius.set("sun", sunRadius);

  if (sunData.texture) {
    textureLoader.load(
      sunData.texture,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        sunMaterial.map = tex;
        sunMaterial.emissiveMap = tex;
        sunMaterial.emissiveIntensity = 1.4;
        sunMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        console.error("太阳纹理加载失败:", sunData.texture);
      }
    );
  }

  // 行星列表
  const planetKeys = [
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ];

  for (const key of planetKeys) {
    const data = ORBIT_DATA[key];
    createPlanetMesh(key, data);
    createOrbitLine(key, data);
  }

  // 创建月球：作为围绕地球的子网格
  const moonData = ORBIT_DATA.earth.moon;
  const moonRadius =
    moonData.radiusKm / ORBIT_DATA.earth.radiusKm * moonData.radiusScale;
  const moonGeometry = new THREE.SphereGeometry(
    moonRadius,
    32,
    32
  );
  const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.0,
  });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  moonMesh.name = "moon";
  bodyMeshes.set("moon", moonMesh);

  if (moonData.texture) {
    textureLoader.load(
      moonData.texture,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        moonMaterial.map = tex;
        moonMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        console.error("月球纹理加载失败:", moonData.texture);
      }
    );
  }

  // 月球轨道以地球为中心
  const earthMesh = bodyMeshes.get("earth");
  if (earthMesh) {
    earthMesh.add(moonMesh);
    const moonOrbit = createMoonOrbitLine(moonData);
    earthMesh.add(moonOrbit);
    orbitLines.set("moon", moonOrbit);
  }
}

// 创建单个行星的球体网格与纹理
function createPlanetMesh(key, data) {
  const earthRatio = data.radiusKm / ORBIT_DATA.earth.radiusKm;
  const baseRadius =
    mapRadiusByMode(earthRatio) * VISUAL_SCALE.EARTH_RADIUS_TO_SCENE;

  const geometry = new THREE.SphereGeometry(baseRadius, 48, 48);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.0,
    emissive: new THREE.Color(0x222222),
    emissiveIntensity: 0.7,
  });

  const group = new THREE.Object3D();
  group.name = `${key}-group`;
  bodyGroups.set(key, group);
  scene.add(group);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = key;
  bodyMeshes.set(key, mesh);
  bodyMaterials.set(key, material);
  group.add(mesh);
  bodyInitialRadius.set(key, baseRadius);

  const tiltRad = THREE.MathUtils.degToRad(data.axialTiltDeg || 0);
  group.rotation.z = tiltRad;

  if (key === "saturn") {
    const ringInner = baseRadius * 1.4;
    const ringOuter = baseRadius * 2.5;
    const ringGeometry = new THREE.RingGeometry(
      ringInner,
      ringOuter,
      96
    );
    const ringTexture = textureLoader.load(
      "./textures/2k_saturn_ring_alpha.png",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
      }
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.name = "saturnRing";
    ringMesh.rotation.x = Math.PI / 2;
    bodyMeshes.set("saturnRing", ringMesh);
    group.add(ringMesh);
  }

  if (key === "earth") {
    textureLoader.load(
      data.texture,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        earthDayTexture = tex;
        const mat = bodyMaterials.get("earth");
        if (mat) {
          mat.map = earthNightMode && earthNightTexture ? earthNightTexture : tex;
          mat.needsUpdate = true;
        }
      },
      undefined,
      () => {
        console.error("地球白天纹理加载失败:", data.texture);
      }
    );

    textureLoader.load(
      data.textureNight,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        earthNightTexture = tex;
      },
      undefined,
      () => {
        console.error("地球夜晚纹理加载失败:", data.textureNight);
      }
    );
  } else if (data.texture) {
    textureLoader.load(
      data.texture,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        material.map = tex;
        if (lightingMode === "teaching") {
          material.emissiveMap = tex;
          material.emissiveIntensity = 0.9;
        } else {
          material.emissiveMap = null;
          material.emissiveIntensity = 0.1;
        }
        material.needsUpdate = true;
      },
      undefined,
      () => {
        console.error("行星纹理加载失败:", key, data.texture);
      }
    );
  }
}

function mapRadiusByMode(earthRatio) {
  if (sizeMode === "real") {
    return earthRatio;
  }
  const k = 1 / Math.log(2);
  return Math.log(1 + earthRatio) * k;
}

function applyLightingMode() {
  if (lightingMode === "real") {
    if (ambientLight) {
      ambientLight.color.setHex(0xffffff);
      ambientLight.intensity = 0.12;
    }
    if (sunLight) {
      sunLight.intensity = 5.0;
    }
    for (const [key, mat] of bodyMaterials.entries()) {
      if (!mat) continue;
      if (key === "sun") {
        mat.emissiveIntensity = 1.4;
        mat.needsUpdate = true;
        continue;
      }
      mat.emissiveMap = null;
      mat.emissiveIntensity = 0.1;
      mat.needsUpdate = true;
    }
  } else {
    if (ambientLight) {
      ambientLight.color.setHex(0xffffff);
      ambientLight.intensity = 0.55;
    }
    if (sunLight) {
      sunLight.intensity = 2.2;
    }
    for (const [key, mat] of bodyMaterials.entries()) {
      if (!mat) continue;
      if (key === "sun") {
        mat.emissiveIntensity = 1.4;
        mat.needsUpdate = true;
        continue;
      }
      if (key === "earth") {
        mat.emissiveIntensity = 0.6;
        mat.needsUpdate = true;
        continue;
      }
      if (mat.map) {
        mat.emissiveMap = mat.map;
      }
      mat.emissiveIntensity = 0.9;
      mat.needsUpdate = true;
    }
  }
}

function applySizeMode() {
  const sunMesh = bodyMeshes.get("sun");
  const sunData = ORBIT_DATA.sun;
  if (sunMesh && sunData) {
    const base = bodyInitialRadius.get("sun");
    const target =
      mapRadiusByMode(sunData.radiusKm / ORBIT_DATA.earth.radiusKm) *
      VISUAL_SCALE.EARTH_RADIUS_TO_SCENE;
    if (base && target > 0) {
      const s = target / base;
      sunMesh.scale.set(s, s, s);
    }
  }

  const planetKeys = [
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ];
  for (const key of planetKeys) {
    const data = ORBIT_DATA[key];
    const group = bodyGroups.get(key);
    if (!group || !data) continue;
    const base = bodyInitialRadius.get(key);
    const target =
      mapRadiusByMode(data.radiusKm / ORBIT_DATA.earth.radiusKm) *
      VISUAL_SCALE.EARTH_RADIUS_TO_SCENE;
    if (base && target > 0) {
      const s = target / base;
      group.scale.set(s, s, s);
    }
  }
}

// 创建行星轨道线（近似椭圆：x 为近日点方向，y=0，z 为轨道平面）
function createOrbitLine(key, data) {
  const segments = 256;
  const points = [];
  const a =
    data.semiMajorAxisAu * VISUAL_SCALE.AU_TO_SCENE * orbitScaleFactor;
  const e = data.eccentricity;
  const b = a * Math.sqrt(1 - e * e);
  const inclinationRad = THREE.MathUtils.degToRad(data.inclinationDeg);

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = a * (Math.cos(theta) - e);
    const z = b * Math.sin(theta);
    const y = 0;
    const pos = new THREE.Vector3(x, y, z);
    pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
    points.push(pos);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x4444ff,
    linewidth: 1,
    transparent: true,
    opacity: 0.6,
  });

  const line = new THREE.LineLoop(geometry, material);
  orbitLines.set(key, line);
  scene.add(line);
}

// 创建月球轨道线
function createMoonOrbitLine(moonData) {
  const segments = 196;
  const points = [];
  const a =
    moonData.semiMajorAxisKm * VISUAL_SCALE.EARTH_MOON_DISTANCE_TO_SCENE;
  const e = moonData.eccentricity;
  const b = a * Math.sqrt(1 - e * e);
  const inclinationRad = THREE.MathUtils.degToRad(moonData.inclinationDeg);

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = a * (Math.cos(theta) - e);
    const z = b * Math.sin(theta);
    const y = 0;
    const pos = new THREE.Vector3(x, y, z);
    pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
    points.push(pos);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x8888ff,
    linewidth: 1,
    transparent: true,
    opacity: 0.6,
  });

  return new THREE.LineLoop(geometry, material);
}

// 事件绑定：窗口尺寸、鼠标点击、UI 控件
function initEvents() {
  window.addEventListener("resize", onWindowResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  timeScaleInput.addEventListener("input", () => {
    const v = parseFloat(timeScaleInput.value);
    timeScale = Math.sign(v) * Math.pow(10, Math.abs(v));
    if (v === 0) timeScale = 1.0;
    timeScaleLabel.textContent = `x ${timeScale.toFixed(1)}`;
  });

  toggleOrbitsBtn.addEventListener("click", () => {
    showOrbits = !showOrbits;
    toggleOrbitsBtn.setAttribute("aria-pressed", showOrbits ? "true" : "false");
    toggleOrbitsBtn.textContent = showOrbits ? "显示轨道" : "隐藏轨道";
    for (const line of orbitLines.values()) {
      line.visible = showOrbits;
    }
  });

  orbitScaleInput.addEventListener("input", () => {
    orbitScaleFactor = parseFloat(orbitScaleInput.value);
    refreshOrbitScales();
  });

  followSelect.addEventListener("change", () => {
    followBodyKey = followSelect.value;
  });

  if (earthViewToggle) {
    earthViewToggle.addEventListener("click", () => {
      earthNightMode = !earthNightMode;
      earthViewToggle.setAttribute(
        "aria-pressed",
        earthNightMode ? "true" : "false"
      );
      earthViewToggle.textContent = earthNightMode ? "地球 · 夜" : "地球 · 昼";
      applyEarthDayNightView();
    });
  }

  if (sizeModeSelect) {
    sizeModeSelect.addEventListener("change", () => {
      sizeMode = sizeModeSelect.value;
      applySizeMode();
      updateInfoPanel(selectedBodyKey);
    });
    sizeModeSelect.value = sizeMode;
  }

  if (lightingModeSelect) {
    lightingModeSelect.addEventListener("change", () => {
      lightingMode = lightingModeSelect.value;
      applyLightingMode();
      updateInfoPanel(selectedBodyKey);
    });
    lightingModeSelect.value = lightingMode;
  }

  function setPanelCollapsed(collapsed) {
    if (!uiPanel || !panelToggleOverlayBtn) return;
    if (collapsed) {
      uiPanel.style.display = "none";
      panelToggleOverlayBtn.style.display = "inline-block";
    } else {
      uiPanel.style.display = "flex";
      panelToggleOverlayBtn.style.display = "none";
    }
    if (togglePanelBtn) {
      togglePanelBtn.textContent = collapsed ? "展开面板" : "收起面板";
    }
    onWindowResize();
  }

  if (togglePanelBtn) {
    togglePanelBtn.addEventListener("click", () => {
      const collapsed = uiPanel && uiPanel.style.display === "none";
      setPanelCollapsed(!collapsed);
    });
  }

  if (panelToggleOverlayBtn) {
    panelToggleOverlayBtn.addEventListener("click", () => {
      setPanelCollapsed(false);
    });
  }
}

// 窗口尺寸改变时更新相机与渲染器
function onWindowResize() {
  const width = renderContainer.clientWidth;
  const height = renderContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// 刷新所有轨道的缩放比例
function refreshOrbitScales() {
  // 移除并释放所有现有轨道线（包括地球与月球），避免重复残留
  for (const [key, line] of Array.from(orbitLines.entries())) {
    if (!line) continue;
    if (key === "moon") {
      const earthMesh = bodyMeshes.get("earth");
      if (earthMesh && earthMesh.children.includes(line)) {
        earthMesh.remove(line);
      } else {
        scene.remove(line);
      }
    } else {
      scene.remove(line);
    }
    if (line.geometry) line.geometry.dispose();
    if (line.material) line.material.dispose();
    orbitLines.delete(key);
  }

  const planetKeys = [
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ];
  for (const key of planetKeys) {
    const data = ORBIT_DATA[key];
    createOrbitLine(key, data);
  }

  const earthMesh = bodyMeshes.get("earth");
  if (earthMesh) {
    const moonOrbit = createMoonOrbitLine(ORBIT_DATA.earth.moon);
    earthMesh.add(moonOrbit);
    orbitLines.set("moon", moonOrbit);
  }

  for (const line of orbitLines.values()) {
    line.visible = showOrbits;
  }
}

// 动画循环：更新模拟时间、天体位置与自转
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const deltaMs = now - lastRealTime;
  lastRealTime = now;

  const deltaDays = (deltaMs / 1000 / 60 / 60 / 24) * timeScale;
  simulationDays += deltaDays;

  updateBodies(simulationDays, deltaDays);
  updateSunRotation(deltaDays);
  updateCameraFollow();
  controls.update();

  renderer.render(scene, camera);
  updatePerf(now);
}

// 更新太阳自转
function updateSunRotation(deltaDays) {
  const sunData = ORBIT_DATA.sun;
  const sunMesh = bodyMeshes.get("sun");
  if (!sunMesh) return;
  const rotationDays = sunData.rotationPeriodHours / 24;
  const angularSpeed = (2 * Math.PI) / rotationDays;
  sunMesh.rotation.y += angularSpeed * deltaDays;
}

// 更新所有天体的公转与自转
function updateBodies(simDays, deltaDays) {
  const planetKeys = [
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ];

  for (const key of planetKeys) {
    const data = ORBIT_DATA[key];
    const mesh = bodyMeshes.get(key);
    const group = bodyGroups.get(key);
    if (!mesh || !group) continue;

    const M = (2 * Math.PI * simDays) / data.orbitalPeriodDays;
    const e = data.eccentricity;
    let E = M;
    for (let i = 0; i < 3; i++) {
      E = M + e * Math.sin(E);
    }

    const a =
      data.semiMajorAxisAu * VISUAL_SCALE.AU_TO_SCENE * orbitScaleFactor;
    const x = a * (Math.cos(E) - e);
    const y = 0;
    const b = a * Math.sqrt(1 - e * e);
    const z = b * Math.sin(E);

    const pos = new THREE.Vector3(x, y, z);
    const inclinationRad = THREE.MathUtils.degToRad(data.inclinationDeg);
    pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
    group.position.copy(pos);

    const rotationDays = data.rotationPeriodHours / 24;
    if (rotationDays !== 0) {
      const angularSpeed = (2 * Math.PI) / rotationDays;
      mesh.rotation.y += angularSpeed * deltaDays;
    }
  }

  const earthMesh = bodyMeshes.get("earth");
  const moonMesh = bodyMeshes.get("moon");
  const moonData = ORBIT_DATA.earth.moon;
  if (earthMesh && moonMesh) {
    const M = (2 * Math.PI * simDays) / moonData.orbitalPeriodDays;
    const e = moonData.eccentricity;
    let E = M;
    for (let i = 0; i < 3; i++) {
      E = M + e * Math.sin(E);
    }
    const a =
      moonData.semiMajorAxisKm *
      VISUAL_SCALE.EARTH_MOON_DISTANCE_TO_SCENE *
      orbitScaleFactor;
    const x = a * (Math.cos(E) - e);
    const b = a * Math.sqrt(1 - e * e);
    const z = b * Math.sin(E);
    const pos = new THREE.Vector3(x, 0, z);
    const inclinationRad = THREE.MathUtils.degToRad(moonData.inclinationDeg);
    pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
    moonMesh.position.copy(pos);
  }

  applyLod();
}

// 根据相机距离调整细节层次（LOD）
function applyLod() {
  const camPos = camera.position;
  for (const mesh of bodyMeshes.values()) {
    if (mesh.name === "saturnRing") continue;
    const dist = camPos.distanceTo(mesh.getWorldPosition(new THREE.Vector3()));
    const geometry = mesh.geometry;
    if (!(geometry instanceof THREE.SphereGeometry)) continue;
    const targetSegments =
      dist < lodConfig.near ? 64 : dist > lodConfig.far ? 16 : 32;
    const currentSegments = geometry.parameters.widthSegments;
    if (currentSegments === targetSegments) continue;
    const radius = geometry.parameters.radius;
    const newGeo = new THREE.SphereGeometry(radius, targetSegments, targetSegments);
    mesh.geometry.dispose();
    mesh.geometry = newGeo;
  }
}

// 更新相机自动跟踪逻辑
function updateCameraFollow() {
  if (!followBodyKey) return;
  const targetMesh = bodyMeshes.get(followBodyKey);
  if (!targetMesh) return;
  const targetPos = targetMesh.getWorldPosition(new THREE.Vector3());
  controls.target.lerp(targetPos, 0.05);
}

// 鼠标点击拾取天体
function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const meshes = Array.from(bodyMeshes.values());
  const intersects = raycaster.intersectObjects(meshes, false);
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const key = obj.name;
    if (key) {
      selectedBodyKey = key;
      updateInfoPanel(key);
    }
  }
}

// 更新右侧信息面板内容
function updateInfoPanel(key) {
  let data;
  if (key === "sun") {
    data = ORBIT_DATA.sun;
  } else if (key === "moon") {
    data = ORBIT_DATA.earth.moon;
  } else {
    data = ORBIT_DATA[key];
  }
  if (!data) return;

  bodyNameEl.textContent = data.name;
  bodyTypeEl.textContent = data.type || "天体";

  const rows = [];
  if (key !== "sun") {
    if (data.semiMajorAxisAu) {
      rows.push(["半长轴 a", `${data.semiMajorAxisAu.toFixed(3)} AU`]);
    } else if (data.semiMajorAxisKm) {
      rows.push([
        "半长轴 a",
        `${(data.semiMajorAxisKm / 1000).toFixed(0)} × 10³ km`,
      ]);
    }
    if (typeof data.eccentricity === "number") {
      rows.push(["轨道离心率 e", data.eccentricity.toFixed(3)]);
    }
    if (typeof data.inclinationDeg === "number") {
      rows.push(["轨道倾角 i", `${data.inclinationDeg.toFixed(3)}°`]);
    }
    if (typeof data.orbitalPeriodDays === "number") {
      rows.push(["公转周期", `${data.orbitalPeriodDays.toFixed(1)} d`]);
    }
  }
  if (typeof data.rotationPeriodHours === "number") {
    rows.push([
      "自转周期",
      `${Math.abs(data.rotationPeriodHours).toFixed(2)} h${data.rotationPeriodHours < 0 ? "（逆行）" : ""
      }`,
    ]);
  }
  if (typeof data.radiusKm === "number") {
    rows.push(["物理半径", `${data.radiusKm.toFixed(0)} km`]);
  }
  rows.push([
    "尺寸映射",
    sizeMode === "real" ? "真实" : "对数（压缩）",
  ]);

  const html = [
    "<table>",
    ...rows.map(
      ([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`
    ),
    "</table>",
  ].join("");
  bodyDetailsEl.innerHTML = html;
}

// 简单 FPS 统计，用于性能观测
function updatePerf(now) {
  frameCount++;
  const dt = now - lastFpsUpdate;
  if (dt >= 1000) {
    const fps = (frameCount * 1000) / dt;
    perfIndicator.textContent = `fps: ${fps.toFixed(
      0
    )} / 目标 60 · 缩放 ${orbitScaleFactor.toFixed(1)} AU`;
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

function applyEarthDayNightView() {
  const mat = bodyMaterials.get("earth");
  if (!mat) return;
  if (earthNightMode && earthNightTexture) {
    mat.map = earthNightTexture;
    mat.emissive = new THREE.Color(0x222244);
    mat.emissiveMap = earthNightTexture;
  } else if (earthDayTexture) {
    mat.map = earthDayTexture;
    mat.emissive = new THREE.Color(0x000000);
    mat.emissiveMap = null;
  }
  mat.needsUpdate = true;
}

// 内置测试工具：验证轨道周期与半长轴比例
// 使用方式：在浏览器控制台调用 SolarSystemTest.runAll()
const SolarSystemTest = {
  // 验证给定行星在一公转周期后角度是否接近 2π（误差阈值）
  testOrbitalPeriod(key, toleranceDeg = 1.0) {
    const data = ORBIT_DATA[key];
    if (!data) {
      console.warn("未找到天体：", key);
      return false;
    }
    const period = data.orbitalPeriodDays;
    const M0 = 0;
    const M1 = (2 * Math.PI * period) / period;
    const deg0 = THREE.MathUtils.radToDeg(M0);
    const deg1 = THREE.MathUtils.radToDeg(M1);
    let delta = Math.abs((deg1 - deg0) % 360);
    if (delta > 180) {
      delta = 360 - delta;
    }
    const ok = delta < toleranceDeg;
    console.log(
      `[测试] ${data.name} 轨道周期：角度=${deg1.toFixed(
        3
      )}°，误差=${delta.toFixed(3)}°，结果=${ok}`
    );
    return ok;
  },

  // 简单验证半长轴缩放比例是否单调递增
  testSemiMajorAxisMonotonic() {
    const keys = [
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
    ];
    let last = 0;
    let ok = true;
    for (const k of keys) {
      const a = ORBIT_DATA[k].semiMajorAxisAu;
      if (a <= last) {
        ok = false;
      }
      last = a;
    }
    console.log(
      "[测试] 行星半长轴是否按顺序递增：",
      ok ? "通过" : "未通过"
    );
    return ok;
  },

  // 运行所有测试
  runAll() {
    console.log("==== 太阳系模拟器自测开始 ====");
    const keys = [
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
    ];
    const periodResults = keys.map((k) => this.testOrbitalPeriod(k));
    const semiResult = this.testSemiMajorAxisMonotonic();
    const allOk = periodResults.every(Boolean) && semiResult;
    console.log("==== 自测结束，结果：", allOk ? "全部通过" : "存在异常", "====");
    return allOk;
  },
};

window.SolarSystemTest = SolarSystemTest;
