const scenes = document.querySelectorAll<HTMLElement>("[data-celestial-scene]");

function currentMode(): "earth" | "moon" {
  return document.documentElement.dataset.theme === "light" ? "moon" : "earth";
}

function useFallback(container: HTMLElement) {
  container.dataset.celestialStatus = "fallback";
  container.dataset.celestialMode = currentMode();
}

function supportsWebGl(): boolean {
  try {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

async function initialize(container: HTMLElement) {
  container.dataset.celestialMode = currentMode();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !supportsWebGl()) {
    useFallback(container);
    return;
  }

  const canvas = container.querySelector<HTMLCanvasElement>("[data-celestial-canvas]");
  const earthUrl = container.dataset.earthTexture;
  const moonUrl = container.dataset.moonTexture;
  if (!canvas || !earthUrl || !moonUrl) {
    useFallback(container);
    return;
  }

  try {
    const { startCelestialScene } = await import("./celestial-three");
    Reflect.set(window, "__AURORA_THREE_LOADED__", true);
    await startCelestialScene({ container, canvas, earthUrl, moonUrl, useFallback });
  } catch {
    useFallback(container);
  }
}

for (const scene of scenes) void initialize(scene);
