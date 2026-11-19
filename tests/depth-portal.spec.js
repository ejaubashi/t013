import { test, expect } from "@playwright/test";

test.use({ trace: "off", reducedMotion: "no-preference" });

test("renders exact source and destination endpoints with a spatial aperture between them", async ({ page }) => {
  // Isolate the compositor so shader errors and unwanted whole-image blending
  // cannot hide behind the real gallery's similar white room colours.
  await page.route("**/__portal-check", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Portal rendering check</title>" }));
  await page.goto("/__portal-check");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { RoomTransitionPass } = await import("/src/spatial/roomTransitions.js");
    const renderer = new THREE.WebGLRenderer(), camera = new THREE.PerspectiveCamera(60, 1, .1, 10);
    const pass = new RoomTransitionPass({ camera });
    renderer.setSize(64, 64); pass.setSize(64, 64);
    const target = new THREE.WebGLRenderTarget(64, 64), quad = pass.quad;
    const solid = (r, g, b) => {
      const texture = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1); texture.needsUpdate = true; return texture;
    };
    const sceneTarget = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType,
      samples: Math.min(2, renderer.capabilities.maxSamples), depthTexture: new THREE.DepthTexture(64, 64, THREE.UnsignedIntType) });
    const scene = new THREE.Scene(), plane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial());
    plane.position.z = -2; scene.add(plane); renderer.setRenderTarget(sceneTarget); renderer.render(scene, camera);
    pass.copyImage(renderer, sceneTarget.texture, pass.history, sceneTarget.depthTexture);
    const probe = new THREE.ShaderMaterial({ uniforms: { image: { value: pass.history.texture } },
      vertexShader: pass.copy.vertexShader,
      fragmentShader: "uniform sampler2D image; varying vec2 vUv; void main(){gl_FragColor=vec4(vec3(texture2D(image,vUv).a/10.0),1.0);}" });
    quad.material = probe; renderer.setRenderTarget(target); quad.render(renderer);
    const depthPixel = new Uint8Array(4); renderer.readRenderTargetPixels(target, 32, 32, 1, 1, depthPixel);
    const oldImage = solid(32, 220, 48), newImage = solid(220, 32, 192);
    pass.copyImage(renderer, oldImage, pass.history); pass.hasHistory = true;
    const corners = [[.35, .2], [.55, .25], [.6, .8], [.35, .85]];
    pass.begin(corners); pass.finish(renderer);
    pass.copyImage(renderer, pass.history.texture, target);
    const interruptedPixel = new Uint8Array(4); renderer.readRenderTargetPixels(target, 32, 32, 1, 1, interruptedPixel);
    pass.begin(corners);
    pass.copyImage(renderer, newImage, pass.arrival);
    const frames = [];
    for (const p of [0, .3, 1]) {
      pass.setProgress(p); quad.material = pass.material; renderer.setRenderTarget(target); quad.render(renderer);
      const pixels = new Uint8Array(64 * 64 * 4); renderer.readRenderTargetPixels(target, 0, 0, 64, 64, pixels);
      const at = (x, y) => [...pixels.slice((y * 64 + x) * 4, (y * 64 + x) * 4 + 3)];
      frames.push({ center: at(30, 32), corner: at(2, 2), samples: [[2, 2], [60, 2], [2, 60], [60, 60], [30, 32]].map(([x, y]) => at(x, y)) });
    }
    renderer.setRenderTarget(null); oldImage.dispose(); newImage.dispose(); target.dispose(); sceneTarget.dispose(); plane.geometry.dispose(); plane.material.dispose(); probe.dispose(); pass.dispose(); renderer.dispose();
    return { frames, depth: depthPixel[0], interrupted: [...interruptedPixel.slice(0, 3)] };
  });
  const close = (actual, expected) => actual.forEach((value, i) => expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(2));
  expect(Math.abs(result.depth - 51)).toBeLessThanOrEqual(2);
  close(result.interrupted, [32, 220, 48]);
  result.frames[0].samples.forEach(pixel => close(pixel, [32, 220, 48]));
  result.frames[2].samples.forEach(pixel => close(pixel, [220, 32, 192]));
  close(result.frames[1].center, [220, 32, 192]); close(result.frames[1].corner, [32, 220, 48]);
});

test("switches rooms from the island, preserves first person, and opens the collection from the unified dock", async ({ page }) => {
  test.setTimeout(150000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/?view=spatial&room=pavilion");
  const canvas = page.locator(".spatial-canvas canvas"), navigator = page.getByRole("navigation", { name: "Move between rooms" });
  await expect(navigator.getByRole("button", { name: "Go to Scarlet Room", exact: true })).toBeEnabled({ timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 45000 });
  for (const [id, name] of [["orbit", "Scarlet Room"], ["garden", "Night Garden"], ["prism", "Obsidian Room"]]) {
    const button = navigator.getByRole("button", { name: `Go to ${name}`, exact: true });
    await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press("Enter");
    await expect(canvas).toHaveAttribute("data-room", id);
    await expect(canvas).toHaveAttribute("data-room-transition", "idle", { timeout: 30000 });
    await expect(button).toHaveAttribute("aria-current", "location");
    await expect(canvas).toHaveAttribute("data-navigation", "walk");
    expect((await canvas.getAttribute("data-camera")).split(",")[1]).toBe("1.720");
  }
  await navigator.getByRole("button", { name: "Open gallery atlas" }).click();
  await expect(page.getByRole("dialog")).toContainText("4 of 4 rooms explored");
  await page.keyboard.press("Escape");
  const collection = page.getByRole("button", { name: "Browse wall artworks", exact: true });
  await collection.click(); await expect(page.getByRole("dialog", { name: "The art collection." })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(collection).toBeFocused();
  await page.getByRole("button", { name: "View artwork without interface" }).click();
  await expect(navigator).toBeHidden(); await page.keyboard.press("Escape"); await expect(navigator).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("morphs only the tool dock with native view transitions and keeps the fallback usable", async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    window.__dockTransitions = [];
    window.__dockNative = typeof document.startViewTransition === "function";
    for (const prototype of [Element.prototype, Document.prototype]) {
      const original = prototype.startViewTransition;
      if (!original) continue;
      prototype.startViewTransition = function (update) {
        const record = { scope: this === document ? "document" : "element", ready: false,
          root: getComputedStyle(document.documentElement).viewTransitionName,
          canvas: getComputedStyle(document.querySelector("canvas")).viewTransitionName };
        window.__dockTransitions.push(record);
        const transition = original.call(this, update);
        transition.ready.then(() => { record.ready = true; }, error => { record.error = `${error.name}: ${error.message}`; });
        return transition;
      };
    }
  });
  await page.goto("/?view=spatial&room=pavilion");
  const canvas = page.locator(".spatial-canvas canvas");
  await expect(page.getByRole("button", { name: "Start guided journey", exact: true })).toBeEnabled({ timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 45000 });
  await page.getByRole("button", { name: "Start guided journey", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(page.getByRole("complementary", { name: "Guided journey" })).toBeVisible();
  if (await page.evaluate(() => window.__dockNative)) {
    await expect.poll(() => page.evaluate(() => window.__dockTransitions[0]?.ready)).toBe(true).catch(async error => { console.log(await page.evaluate(() => window.__dockTransitions)); throw error; });
    const record = await page.evaluate(() => window.__dockTransitions[0]);
    expect(record.canvas).toBe("none");
    if (record.scope === "document") expect(record.root).toBe("none");
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-gallery-morph"))).toBe(false);
  await page.getByRole("button", { name: "Walk in first person", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 20000 });
  if (await page.evaluate(() => window.__dockNative)) {
    await expect.poll(() => page.evaluate(() => window.__dockTransitions.length === 2 && window.__dockTransitions.every(record => record.ready))).toBe(true);
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-gallery-morph"))).toBe(false);
  const before = await page.evaluate(() => window.__dockTransitions.length);
  await page.evaluate(() => {
    Object.defineProperty(Element.prototype, "startViewTransition", { value: undefined, configurable: true });
    Object.defineProperty(Document.prototype, "startViewTransition", { value: undefined, configurable: true });
  });
  await page.getByRole("button", { name: "Start guided journey", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(page.getByRole("complementary", { name: "Guided journey" })).toBeVisible();
  await page.getByRole("button", { name: "Walk in first person", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 20000 });
  await expect(page.getByRole("toolbar", { name: "Choose a viewpoint" })).toHaveCount(0);
  expect((await canvas.getAttribute("data-camera")).split(",")[1]).toBe("1.720");
  expect(await page.evaluate(() => window.__dockTransitions.length)).toBe(before);
});
