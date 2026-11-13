import { test, expect } from "@playwright/test";

test.use({ trace: "off" });

async function ready(page, reduced = false) {
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.goto("/?view=spatial");
  await expect(page.getByRole("button", { name: "Walk in first person", exact: true })).toBeEnabled({ timeout: 60000 });
  const canvas = page.locator(".spatial-canvas canvas");
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  return canvas;
}

function errorsFrom(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  return errors;
}

test("keeps walking controls and guidance separate in portrait and short landscape layouts", async ({ page }, info) => {
  test.setTimeout(90000);
  await ready(page, true);
  const viewports = info.project.name === "mobile" ? [[390, 664], [900, 540], [390, 664]] : [[1440, 900], [900, 540]];
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await expect.poll(async () => {
    const rectangles = await page.evaluate(() => [".gallery-collection-launch", ".walk-invitation", ".walk-thumbstick", ".walk-mode-switch", ".gallery-toolbox"]
      .map((selector) => {
        const element = document.querySelector(selector), box = element.getBoundingClientRect();
        return getComputedStyle(element).visibility !== "hidden" && box.width && box.height ? { selector, x: box.x, y: box.y, width: box.width, height: box.height } : null;
      }).filter(Boolean));
    const collisions = [];
    for (let a = 0; a < rectangles.length; a++) for (let b = a + 1; b < rectangles.length; b++) {
      const one = rectangles[a], two = rectangles[b];
      const overlap = Math.min(one.x + one.width, two.x + two.width) > Math.max(one.x, two.x) + 1 &&
        Math.min(one.y + one.height, two.y + two.height) > Math.max(one.y, two.y) + 1;
      if (overlap) collisions.push({ one, two });
    }
    return collisions;
    }, { message: `Walking layout settles without overlap at ${width} × ${height}` }).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

async function floorPoint(page, canvas) {
  const viewport = page.viewportSize();
  for (let attempt = 0; attempt < 2; attempt++) {
  for (const [x, y] of [[0.6, 0.7], [0.45, 0.7], [0.8, 0.65], [0.2, 0.65], [0.6, 0.55]]) {
    const point = { x: viewport.width * x, y: viewport.height * y };
    if (await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, point) !== "CANVAS") continue;
    await page.mouse.move(point.x, point.y);
    const target = await canvas.getAttribute("data-walk-floor");
    if (target && target !== "none") return { ...point, target: target.split(",").map(Number) };
  }
  if (!attempt) {
    // A portrait viewport can show only the central pool. Look down toward
    // the visitor's feet before selecting an actual reachable floor surface.
    const look = await canvas.getAttribute("data-look");
    await page.mouse.move(viewport.width * 0.75, viewport.height * 0.38); await page.mouse.down();
    await page.mouse.move(viewport.width * 0.75, viewport.height * 0.58, { steps: 7 }); await page.mouse.up();
    await expect.poll(() => canvas.getAttribute("data-look")).not.toBe(look);
  }
  }
  throw new Error("No walkable floor is visible through the gallery interface");
}

test("shows the arrival after loading, looks without orbiting, and eases walking to rest", async ({ page }) => {
  test.setTimeout(120000);
  const errors = errorsFrom(page);
  await page.addInitScript(() => {
    window.__arrivalFrames = [];
    new MutationObserver(() => {
      const canvas = document.querySelector(".spatial-canvas canvas"), walk = document.querySelector('button[aria-label="Walk in first person"]');
      if (!canvas?.dataset.camera || !walk || walk.disabled || canvas.dataset.arrival !== "entering") return;
      if (window.__arrivalFrames.at(-1) !== canvas.dataset.camera) window.__arrivalFrames.push(canvas.dataset.camera);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-camera", "disabled"] });
  });
  const canvas = await ready(page);
  await expect(canvas).toHaveAttribute("data-arrival", "complete", { timeout: 20000 });
  const frames = await page.evaluate(() => window.__arrivalFrames);
  expect(frames.length).toBeGreaterThan(2);
  expect(Math.abs(Number(frames[0].split(",")[2]) - Number(frames.at(-1).split(",")[2]))).toBeGreaterThan(1);
  expect(frames.every((frame) => frame.split(",")[1] === "1.720")).toBe(true);
  await expect(page.getByRole("toolbar", { name: "Choose a viewpoint" })).toHaveCount(0);
  const before = await canvas.getAttribute("data-camera"), look = await canvas.getAttribute("data-look"), viewport = page.viewportSize();
  await page.mouse.move(viewport.width * 0.4, viewport.height * 0.4); await page.mouse.down();
  await page.mouse.move(viewport.width * 0.6, viewport.height * 0.44, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => canvas.getAttribute("data-look")).not.toBe(look);
  await expect(canvas).toHaveAttribute("data-camera", before);
  await canvas.focus(); await page.keyboard.down("KeyW");
  await expect.poll(async () => Number(await canvas.getAttribute("data-walk-speed"))).toBeGreaterThan(1);
  await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(before);
  await page.keyboard.up("KeyW");
  await expect(canvas).toHaveAttribute("data-walk-speed", "0.000");
  const stopped = await canvas.getAttribute("data-camera");
  await page.waitForTimeout(200); await expect(canvas).toHaveAttribute("data-camera", stopped);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(stopped);
  await page.getByRole("button", { name: "Browse wall artworks" }).click();
  await expect(page.getByRole("dialog", { name: "The art collection.", exact: true })).toBeVisible();
  await expect(canvas).toHaveAttribute("data-walk-speed", "0.000");
  await page.keyboard.press("Escape");
  expect((await canvas.getAttribute("data-camera")).split(",")[1]).toBe("1.720");
  expect(errors).toEqual([]);
});

test("walks around the installation and through a physical doorway into the next room", async ({ page }) => {
  test.setTimeout(180000);
  const errors = errorsFrom(page), canvas = await ready(page);
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-arrival", "complete");
  await page.getByRole("button", { name: "Door to Orbit Hall", exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute("data-walk-route"))).toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute("data-room", "orbit", { timeout: 120000 });
  await expect(canvas).toHaveAttribute("data-room-transition", "idle", { timeout: 30000 });
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
  expect(errors).toEqual([]);
});

test("walks to the floor, visits every room at eye level, and moves between paintings and free walking", async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = errorsFrom(page), canvas = await ready(page, true);
  await expect(canvas).toHaveAttribute("data-arrival", "complete");
  const point = await floorPoint(page, canvas);
  if (info.project.name === "mobile") await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect.poll(async () => {
    const camera = (await canvas.getAttribute("data-camera")).split(",").map(Number);
    return Math.hypot(camera[0] - point.target[0], camera[2] - point.target[1]);
  }).toBeLessThan(0.02);
  for (const [id, name] of [["orbit", "Orbit Hall"], ["garden", "Sky Garden"], ["prism", "Prism Chamber"], ["pavilion", "Lumen Pavilion"]]) {
    await page.getByRole("button", { name: "Open gallery atlas" }).click();
    await page.getByRole("button", { name: `Enter ${name}`, exact: true }).click();
    await expect(canvas).toHaveAttribute("data-room", id);
    await expect(canvas).toHaveAttribute("data-navigation", "walk");
    await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
    await expect(canvas).toHaveAttribute("data-room-transition", "idle");
  }
  await page.getByRole("button", { name: "Browse wall artworks" }).click();
  await page.getByRole("button", { name: "Inspect Composition VI by Wassily Kandinsky", exact: true }).click();
  await page.getByRole("button", { name: "View on the wall" }).click();
  await expect(canvas).toHaveAttribute("data-navigation", "views");
  await expect(canvas).toHaveAttribute("data-camera", "-4.500,3.350,-4.600");
  await expect(page.getByRole("toolbar", { name: "Choose a viewpoint" })).toBeVisible();
  await page.getByRole("button", { name: "Walk in first person", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(canvas).toHaveAttribute("data-camera", "-4.500,1.720,-4.600");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("interrupts arrival, combines touch walking and looking, and keeps fluid room transfers at eye level", async ({ page }, info) => {
  test.setTimeout(150000);
  const errors = errorsFrom(page), canvas = await ready(page);
  await canvas.focus(); await page.keyboard.down("KeyW");
  await expect(canvas).toHaveAttribute("data-arrival", "complete");
  await page.keyboard.up("KeyW");
  await expect(canvas).toHaveAttribute("data-walk-speed", "0.000");
  if (info.project.name === "mobile") {
    const stick = page.getByRole("button", { name: "Walking thumbstick. Drag to move.", exact: true });
    const box = await stick.boundingBox(), viewport = page.viewportSize(), client = await page.context().newCDPSession(page);
    const thumb = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 - 25 };
    const gaze = { id: 2, x: viewport.width * 0.6, y: viewport.height * 0.4 };
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [thumb] });
    await expect.poll(async () => Number(await canvas.getAttribute("data-walk-speed"))).toBeGreaterThan(1);
    const look = await canvas.getAttribute("data-look");
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [thumb, gaze] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [thumb, { ...gaze, x: gaze.x + 70 }] });
    await expect.poll(() => canvas.getAttribute("data-look")).not.toBe(look);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [thumb] });
    const stillWalking = await canvas.getAttribute("data-camera");
    await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(stillWalking);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(canvas).toHaveAttribute("data-walk-speed", "0.000");
  } else {
    const point = await floorPoint(page, canvas);
    await page.mouse.click(point.x, point.y);
    await expect.poll(async () => Number(await canvas.getAttribute("data-walk-route"))).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await expect(canvas).toHaveAttribute("data-walk-route", "0");
  }
  await page.getByRole("button", { name: "Open gallery atlas" }).click();
  await page.getByRole("button", { name: "Enter Orbit Hall", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-room-transition", "travelling");
  await page.getByRole("button", { name: "Skip room transition" }).click();
  await expect(canvas).toHaveAttribute("data-room-transition", "idle");
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
  expect(errors).toEqual([]);
});
