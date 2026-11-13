import { test, expect } from "@playwright/test";

// DOM trace snapshots perturb real-time GPU animation on software Chromium.
// Record post-render frame states instead; keep the failure screenshot.
test.use({ reducedMotion: "no-preference", trace: "off" });

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    const frames = await page.evaluate(() => window.__roomFrames || []).catch(() => []);
    await info.attach("rendered-room-transfers", { body: JSON.stringify(frames, null, 2), contentType: "application/json" });
  }
});

const rooms = {
  pavilion: { name: "Lumen Pavilion", camera: "7.400,3.400,10.800", effect: "afterimage" },
  orbit: { name: "Orbit Hall", camera: "7.400,3.600,10.800", effect: "orbital" },
  garden: { name: "Sky Garden", camera: "7.400,3.800,10.800", effect: "silk" },
  prism: { name: "Prism Chamber", camera: "7.400,3.800,11.200", effect: "spectral" },
};

async function ready(page, room = "pavilion") {
  await page.addInitScript(() => {
    if (window.__roomFrameObserverInstalled) return;
    window.__roomFrameObserverInstalled = true;
    window.__roomFrames = [];
    new MutationObserver(() => {
      const canvas = document.querySelector(".spatial-canvas canvas");
      if (!canvas?.dataset.roomTransition) return;
      const skip = document.querySelector('button[aria-label="Skip room transition"]');
      const frame = { time: performance.now(), phase: canvas.dataset.roomTransition,
        progress: Number(canvas.dataset.transitionProgress), route: canvas.dataset.transitionRoute,
        effect: canvas.dataset.transitionEffect, journey: canvas.dataset.journey,
        renderer: canvas.dataset.transitionRenderer,
        skip: Boolean(skip?.getClientRects().length && getComputedStyle(skip).visibility === "visible") };
      const previous = window.__roomFrames.at(-1);
      if (!previous || previous.phase !== frame.phase || previous.progress !== frame.progress || previous.route !== frame.route)
        window.__roomFrames.push(frame);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-room-transition", "data-transition-progress"] });
  });
  await page.goto(`/?view=spatial&room=${room}`);
  const canvas = page.locator(".spatial-canvas canvas");
  await expect(canvas).toHaveAttribute("data-room", room, { timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 45000 });
  await expect(page.getByRole("button", { name: "Open gallery atlas" })).toBeEnabled({ timeout: 45000 });
  await page.getByRole("button", { name: "Switch to composed views", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-navigation", "views");
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 15000 });
  return canvas;
}

async function choose(page, room) {
  await page.getByRole("button", { name: "Open gallery atlas" }).click();
  await page.getByRole("button", { name: `Enter ${rooms[room].name}`, exact: true }).click();
}

function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

test("animates every directed room pair with a live destination and exact arrival", async ({ page }) => {
  test.setTimeout(300000);
  const errors = collectErrors(page), canvas = await ready(page);
  await expect.poll(async () => Number(await canvas.getAttribute("data-live-portals"))).toBeGreaterThan(0);
  // Euler circuit: all twelve directed edges of the four-room graph, once each.
  const route = ["pavilion", "orbit", "pavilion", "garden", "pavilion", "prism", "orbit", "garden", "orbit", "prism", "garden", "prism", "pavilion"];
  const traversed = new Set();
  for (let index = 1; index < route.length; index++) {
    const from = route[index - 1], to = route[index];
    await choose(page, to);
    await expect.poll(() => page.evaluate(({ route, effect }) => window.__roomFrames.some((frame) =>
      frame.phase === "travelling" && frame.route === route && frame.effect === effect && frame.skip),
      { route: `${from}:${to}`, effect: rooms[to].effect })).toBe(true);
    await expect(canvas).toHaveAttribute("data-room-transition", "idle", { timeout: 45000 });
    await expect(canvas).toHaveAttribute("data-camera", rooms[to].camera);
    await expect(page.getByRole("complementary", { name: "Room transition" })).toHaveCount(0);
    await expect.poll(async () => Number(await canvas.getAttribute("data-live-portals")), { timeout: 15000 }).toBeGreaterThan(0);
    const frames = await page.evaluate((route) => window.__roomFrames.filter((frame) => frame.route === route && frame.phase === "travelling"), `${from}:${to}`);
    expect(frames.some((frame) => frame.progress > 0.15 && frame.progress < 0.45 && frame.renderer === "composite")).toBe(true);
    expect(frames.some((frame) => frame.progress > 0.55 && frame.progress < 0.9 && frame.renderer === "composite")).toBe(true);
    await expect(canvas).toHaveAttribute("data-transition-scene-draws", "1");
    traversed.add(`${from}:${to}`);
  }
  expect(traversed.size).toBe(12);
  await expect.poll(async () => Number(await canvas.getAttribute("data-drawn-splats")), { timeout: 45000 }).toBeGreaterThan(50000);
  expect(errors).toEqual([]);
});

test("interrupts, skips, resizes, and honors reduced motion without stranding the camera", async ({ page }) => {
  test.setTimeout(180000);
  const errors = collectErrors(page), canvas = await ready(page);
  await choose(page, "orbit");
  await expect(canvas).toHaveAttribute("data-room-transition", "travelling");
  // Opening the atlas finishes the current transfer; the next selection starts
  // from the displayed composition instead of an obsolete render target.
  await choose(page, "prism");
  await expect(canvas).toHaveAttribute("data-transition-route", "orbit:prism");
  await expect(canvas).toHaveAttribute("data-room-transition", "travelling");
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-room-transition", "idle");
  await expect(canvas).toHaveAttribute("data-camera", rooms.prism.camera);
  await choose(page, "garden");
  await page.getByRole("button", { name: "Skip room transition" }).click();
  await expect(canvas).toHaveAttribute("data-room-transition", "idle");
  await expect(canvas).toHaveAttribute("data-camera", rooms.garden.camera);
  await choose(page, "pavilion");
  const original = page.viewportSize();
  await page.setViewportSize({ width: original.width - 20, height: original.height + 20 });
  await expect(canvas).toHaveAttribute("data-room-transition", "idle", { timeout: 45000 });
  await expect(canvas).toHaveAttribute("data-camera", rooms.pavilion.camera);
  await canvas.focus(); await page.keyboard.down("KeyW");
  await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(rooms.pavilion.camera);
  await page.keyboard.up("KeyW");
  await page.getByRole("button", { name: "02 The family" }).click();
  await expect(canvas).toHaveAttribute("data-camera", "-4.000,2.450,-3.600", { timeout: 15000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await choose(page, "prism");
  await expect(canvas).toHaveAttribute("data-room", "prism");
  await expect(canvas).toHaveAttribute("data-room-transition", "idle");
  await expect(canvas).toHaveAttribute("data-camera", rooms.prism.camera);
  await expect(page.getByRole("button", { name: "Skip room transition" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("uses the same room transfer for physical doors and the guided journey", async ({ page }) => {
  test.setTimeout(180000);
  const errors = collectErrors(page), canvas = await ready(page, "orbit");
  const doorway = await page.getByRole("button", { name: "Door to Lumen Pavilion", exact: true }).boundingBox();
  expect(doorway).not.toBeNull();
  const point = { x: doorway.x + doorway.width / 2, y: doorway.y + doorway.height / 2 - 35 };
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, point)).toBe("CANVAS");
  await page.mouse.click(point.x, point.y);
  await expect(canvas).toHaveAttribute("data-room-transition", "travelling");
  await expect(canvas).toHaveAttribute("data-transition-route", "orbit:pavilion");
  await expect(canvas).toHaveAttribute("data-room-transition", "idle", { timeout: 45000 });
  await page.getByRole("button", { name: "Start guided journey" }).click();
  for (let index = 1; index <= 5; index++) {
    await page.getByRole("button", { name: "Next journey stop" }).click();
    if (index === 5) {
      await expect.poll(() => page.evaluate(() => window.__roomFrames.some((frame) =>
        frame.journey === "5" && frame.phase === "travelling" && frame.route === "pavilion:orbit"))).toBe(true);
    } else await expect(canvas).toHaveAttribute("data-journey", String(index));
  }
  await expect(canvas).toHaveAttribute("data-transition-route", "pavilion:orbit");
  await expect(canvas).toHaveAttribute("data-room-transition", "idle", { timeout: 45000 });
  await expect(page.getByRole("complementary", { name: "Guided journey" })).toContainText("Beyond the threshold.");
  await page.getByRole("button", { name: "Open gallery atlas" }).click();
  await expect(canvas).toHaveAttribute("data-journey", "stopped");
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});
