// 轨道与物理参数数据，数值基于 NASA NSSDCA 行星参数表，单位经缩放便于可视化
// 半长轴单位：天文单位 AU；轨道周期单位：地球日；自转周期单位：小时
// 倾角、轨道要素参考：https://nssdc.gsfc.nasa.gov/planetary/factsheet/ （2025-12-12 检索）

// 定义太阳系主要天体及若干卫星的参数
export const ORBIT_DATA = {
  // 太阳作为中心恒星，仅提供半径与光度比例，用于渲染
  sun: {
    name: "太阳",
    type: "恒星",
    radiusKm: 696340,
    radiusScale: 25.0,
    rotationPeriodHours: 609.12, // 约 25.38 地球日，折算为小时
    texture: "./textures/8k_sun.jpg",
  },

  // 行星参数大致来自 NASA NSSDCA，保留三位小数足以用于可视化
  mercury: {
    name: "水星",
    type: "类地行星",
    semiMajorAxisAu: 0.387,
    eccentricity: 0.206,
    inclinationDeg: 7.005,
    orbitalPeriodDays: 87.969,
    rotationPeriodHours: 1407.6,
    axialTiltDeg: 0.03,
    radiusKm: 2439.7,
    radiusScale: 0.7,
    texture: "./textures/8k_mercury.jpg",
  },
  venus: {
    name: "金星",
    type: "类地行星",
    semiMajorAxisAu: 0.723,
    eccentricity: 0.007,
    inclinationDeg: 3.394,
    orbitalPeriodDays: 224.701,
    rotationPeriodHours: -5832.5, // 负号表示自转方向与公转相反
    axialTiltDeg: 177.4,
    radiusKm: 6051.8,
    radiusScale: 1.0,
    texture: "./textures/8k_venus_surface.jpg",
  },
  earth: {
    name: "地球",
    type: "类地行星",
    semiMajorAxisAu: 1.0,
    eccentricity: 0.017,
    inclinationDeg: 0.0,
    orbitalPeriodDays: 365.256,
    rotationPeriodHours: 23.934,
    axialTiltDeg: 23.44,
    radiusKm: 6371.0,
    radiusScale: 1.05,
    texture: "./textures/8k_earth_daymap.jpg",
    textureNight: "./textures/8k_earth_nightmap.jpg",
    textureClouds: "./textures/2k_earth_clouds.jpg",
    // 地球专属子对象：月球轨道参数
    moon: {
      name: "月球",
      type: "卫星",
      semiMajorAxisKm: 384400,
      eccentricity: 0.055,
      inclinationDeg: 5.145,
      orbitalPeriodDays: 27.322,
      rotationPeriodHours: 655.7,
      radiusKm: 1737.4,
      radiusScale: 0.3,
      texture: "./textures/8k_moon.jpg",
    },
  },
  mars: {
    name: "火星",
    type: "类地行星",
    semiMajorAxisAu: 1.524,
    eccentricity: 0.0934,
    inclinationDeg: 1.850,
    orbitalPeriodDays: 686.980,
    rotationPeriodHours: 24.623,
    axialTiltDeg: 25.19,
    radiusKm: 3389.5,
    radiusScale: 0.9,
    texture: "./textures/8k_mars.jpg",
  },
  jupiter: {
    name: "木星",
    type: "气体巨行星",
    semiMajorAxisAu: 5.203,
    eccentricity: 0.0484,
    inclinationDeg: 1.305,
    orbitalPeriodDays: 4332.59,
    rotationPeriodHours: 9.925,
    axialTiltDeg: 3.13,
    radiusKm: 69911,
    radiusScale: 11.21,
    texture: "./textures/8k_jupiter.jpg",
  },
  saturn: {
    name: "土星",
    type: "气体巨行星",
    semiMajorAxisAu: 9.537,
    eccentricity: 0.0541,
    inclinationDeg: 2.485,
    orbitalPeriodDays: 10759.22,
    rotationPeriodHours: 10.656,
    axialTiltDeg: 26.73,
    radiusKm: 58232,
    radiusScale: 9.45,
    texture: "./textures/8k_saturn.jpg",
  },
  uranus: {
    name: "天王星",
    type: "冰巨行星",
    semiMajorAxisAu: 19.191,
    eccentricity: 0.0472,
    inclinationDeg: 0.773,
    orbitalPeriodDays: 30685.4,
    rotationPeriodHours: -17.24,
    axialTiltDeg: 97.77,
    radiusKm: 25362,
    radiusScale: 4.01,
    texture: "./textures/2k_uranus.jpg",
  },
  neptune: {
    name: "海王星",
    type: "冰巨行星",
    semiMajorAxisAu: 30.07,
    eccentricity: 0.0086,
    inclinationDeg: 1.770,
    orbitalPeriodDays: 60189.0,
    rotationPeriodHours: 16.11,
    axialTiltDeg: 28.32,
    radiusKm: 24622,
    radiusScale: 3.88,
    texture: "./textures/2k_neptune.jpg",
  },
};

// 可视化缩放常量，用于将 AU 与 km 映射到 three.js 场景空间
export const VISUAL_SCALE = {
  // 将 1 AU 映射为 three.js 中的 50 单位
  AU_TO_SCENE: 50.0,
  // 将 1 地球半径映射为 1.0 单位，半径缩放由 radiusScale 进一步调整
  EARTH_RADIUS_TO_SCENE: 1.0,
  // 将地月距离（384400km）缩放到 around 5 场景单位
  EARTH_MOON_DISTANCE_TO_SCENE: 5.0 / 384400.0,
};
