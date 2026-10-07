import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
} from "three";

interface SceneOptions {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  earthUrl: string;
  moonUrl: string;
  useFallback: (container: HTMLElement) => void;
}

const CELESTIAL_ROTATION_RADIANS_PER_MS = (Math.PI * 2) / (5 * 60 * 1_000);

function currentMode(): "earth" | "moon" {
  return document.documentElement.dataset.theme === "light" ? "moon" : "earth";
}

export async function startCelestialScene({
  container,
  canvas,
  earthUrl,
  moonUrl,
  useFallback,
}: SceneOptions) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 720 ? 1.25 : 1.6));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 20);
  camera.position.set(0, 0.08, 4.25);
  const geometry = new SphereGeometry(1, innerWidth < 720 ? 64 : 96, innerWidth < 720 ? 48 : 64);
  const loader = new TextureLoader();
  const [earthMap, moonMap] = await Promise.all([loader.loadAsync(earthUrl), loader.loadAsync(moonUrl)]);
  earthMap.colorSpace = SRGBColorSpace;
  moonMap.colorSpace = SRGBColorSpace;
  earthMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  moonMap.anisotropy = earthMap.anisotropy;

  const earthMaterial = new MeshStandardMaterial({ map: earthMap, roughness: 0.72, metalness: 0.02 });
  const moonMaterial = new MeshStandardMaterial({ map: moonMap, roughness: 0.94, metalness: 0 });
  const globe = new Mesh(geometry, earthMaterial);
  globe.rotation.z = -0.17;
  scene.add(globe);

  const atmosphereMaterial = new ShaderMaterial({
    side: BackSide,
    transparent: true,
    blending: AdditiveBlending,
    vertexShader: `varying vec3 vNormal; void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vNormal; void main(){float rim=pow(0.72-dot(vNormal,vec3(0.0,0.0,1.0)),2.3);gl_FragColor=vec4(0.24,0.58,1.0,1.0)*rim;}`,
  });
  const atmosphere = new Mesh(new SphereGeometry(1.045, 64, 48), atmosphereMaterial);
  scene.add(atmosphere);
  scene.add(new HemisphereLight(0x8fb9e8, 0x050912, 0.72));
  const keyLight = new DirectionalLight(0xfff5dc, 3.6);
  keyLight.position.set(-2.8, 1.7, 3.4);
  scene.add(keyLight);
  const edgeLight = new DirectionalLight(0x557ec4, 1.2);
  edgeLight.position.set(2.4, -1.2, -1.5);
  scene.add(edgeLight);

  const applyTheme = () => {
    const mode = currentMode();
    container.dataset.celestialMode = mode;
    globe.material = mode === "earth" ? earthMaterial : moonMaterial;
    atmosphere.visible = mode === "earth";
    renderer.toneMappingExposure = mode === "earth" ? 1.05 : 1.22;
  };
  applyTheme();

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  let animationFrame = 0;
  let lastTime = performance.now();
  let running = !document.hidden;
  const render = (time: number) => {
    if (!running) return;
    const delta = Math.min(50, time - lastTime);
    lastTime = time;
    globe.rotation.y += delta * CELESTIAL_ROTATION_RADIANS_PER_MS;
    atmosphere.rotation.y = globe.rotation.y;
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);

  const onVisibility = () => {
    running = !document.hidden;
    if (running) {
      lastTime = performance.now();
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrame);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  canvas.addEventListener("webglcontextlost", () => useFallback(container), { once: true });
  container.dataset.celestialStatus = "active";

  addEventListener("pagehide", () => {
    running = false;
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    geometry.dispose();
    atmosphere.geometry.dispose();
    atmosphereMaterial.dispose();
    earthMaterial.dispose();
    moonMaterial.dispose();
    earthMap.dispose();
    moonMap.dispose();
    renderer.dispose();
  }, { once: true });
}
