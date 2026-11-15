import { test, expect } from "@playwright/test";

test.use({ trace: "off" });

test("enters at eye level, starts sound only by choice, and can mute it", async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__audioContexts = [];
    const NativeAudio = window.AudioContext;
    window.AudioContext = class extends NativeAudio {
      constructor(...args) { super(...args); window.__audioContexts.push(this); }
    };
    window.__cameraHeights = [];
    new MutationObserver(() => {
      const value = document.querySelector(".spatial-canvas canvas")?.dataset.camera;
      if (value) window.__cameraHeights.push(Number(value.split(",")[1]));
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-camera"] });
  });
  await page.goto("/?view=spatial");
  const enter = page.getByRole("button", { name: "Enter with sound", exact: true });
  await expect(enter).toBeEnabled({ timeout: 60000 });
  await expect(page.locator(".nocturne-entrance")).toBeVisible();
  await expect(page.locator(".gallery-navigation-layer")).toBeHidden();
  expect(await page.evaluate(() => window.__audioContexts.length)).toBe(0);
  const canvas = page.locator(".spatial-canvas canvas");
  await expect(canvas).toHaveAttribute("data-camera", "7.300,1.720,11.800");
  await expect(canvas).toHaveAttribute("data-lighting", "night");
  await page.screenshot({ path: info.outputPath("nocturne-entry.png") });
  await enter.click();
  await expect(page.locator(".spatial-stage")).toHaveAttribute("data-sound", "on");
  expect(await page.evaluate(() => window.__audioContexts.length)).toBe(1);
  expect(await page.evaluate(() => window.__audioContexts[0].state)).toBe("running");
  await expect(canvas).toHaveAttribute("data-arrival", "complete", { timeout: 20000 });
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 20000 });
  await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
  await page.getByRole("button", { name: "Mute gallery soundscape", exact: true }).click();
  await expect(page.locator(".spatial-stage")).toHaveAttribute("data-sound", "off");
  await page.getByRole("button", { name: "Enable gallery soundscape", exact: true }).click();
  await expect(page.locator(".spatial-stage")).toHaveAttribute("data-sound", "on");
  expect(await page.evaluate(() => window.__audioContexts.length)).toBe(1);
  expect(await page.evaluate(() => window.__cameraHeights.every(height => height === 1.72))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("nocturne-inside.png") });
  await page.getByRole("button", { name: "Original view", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__audioContexts[0].state)).toBe("closed");
  expect(errors).toEqual([]);
});

test("renders the original spatial soundscape without clipping and fades to silence", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "The native audio graph is independent of viewport size.");
  await page.goto("/?view=classic");
  const signal = await page.evaluate(async () => {
    const { createAmbientGraph } = await import("/src/spatial/galleryAudio.js");
    const context = new OfflineAudioContext(2, 6 * 24000, 24000);
    const graph = createAmbientGraph(context);
    graph.pose({ position: [1, 1.72, 2], direction: [0, 0, -1] });
    graph.setVolume(.24, .1);
    const atTwo = context.suspend(2), atFour = context.suspend(4);
    const rendering = context.startRendering();
    await atTwo;
    graph.setRoom("prism"); graph.footstep(); graph.passage();
    await context.resume(); await atFour;
    graph.setVolume(0, .35); await context.resume();
    const buffer = await rendering;
    let peak = 0, energy = 0, silence = 0, finite = true;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const samples = buffer.getChannelData(c);
      for (let i = 0; i < samples.length; i++) {
        finite &&= Number.isFinite(samples[i]); peak = Math.max(peak, Math.abs(samples[i]));
        if (i > 24000 && i < 4 * 24000) energy += samples[i] ** 2;
        if (i > 5 * 24000) silence = Math.max(silence, Math.abs(samples[i]));
      }
    }
    graph.dispose();
    return { peak, rms: Math.sqrt(energy / (2 * 3 * 24000)), silence, finite };
  });
  expect(signal.finite).toBe(true);
  expect(signal.rms).toBeGreaterThan(.0001);
  expect(signal.peak).toBeLessThan(.6);
  expect(signal.silence).toBeLessThan(.00001);
});
