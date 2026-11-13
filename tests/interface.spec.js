import { test, expect } from "@playwright/test";

test.use({ trace: "off" });

async function ready(page, room = "pavilion") {
  await page.goto(`/?view=spatial&room=${room}`);
  const canvas = page.locator(".spatial-canvas canvas");
  await expect(canvas).toHaveAttribute("data-room", room, { timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 45000 });
  await expect(page.getByRole("button", { name: "Open gallery atlas" })).toBeEnabled({ timeout: 45000 });
  return canvas;
}

function errorsFrom(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

test("navigates the view dock by keyboard, keeps its selection visible, and yields controls to the canvas", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = errorsFrom(page), canvas = await ready(page);
  const toolbar = page.getByRole("toolbar", { name: "Choose a viewpoint" });
  await expect(toolbar.locator('button[tabindex="0"]')).toHaveCount(1);
  await toolbar.getByRole("button", { name: "01 The pavilion", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  const family = toolbar.getByRole("button", { name: "02 The family", exact: true });
  await expect(family).toBeFocused(); await expect(family).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveAttribute("data-camera", "-4.000,2.450,-3.600");
  await page.keyboard.press("End");
  const canopy = toolbar.getByRole("button", { name: "06 The canopy", exact: true });
  await expect(canopy).toBeFocused();
  await expect(canopy).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => {
    const selected = await canopy.boundingBox(), dock = await page.getByRole("navigation", { name: "Room viewpoints" }).boundingBox();
    return selected.x >= dock.x && selected.x + selected.width <= dock.x + dock.width + 1;
  }).toBe(true);
  await expect.poll(async () => {
    const selected = await canopy.boundingBox(), indicator = await page.locator(".view-dock-indicator").boundingBox();
    return Math.abs(selected.x - indicator.x) < 1 && Math.abs(selected.width - indicator.width) < 1;
  }).toBe(true);
  const original = page.viewportSize();
  await page.setViewportSize({ width: original.width > 600 ? 720 : original.width - 35, height: original.height });
  await expect.poll(async () => {
    const selected = await canopy.boundingBox(), dock = await page.getByRole("navigation", { name: "Room viewpoints" }).boundingBox();
    return selected.x >= dock.x && selected.x + selected.width <= dock.x + dock.width + 1;
  }).toBe(true);
  await page.setViewportSize(original);
  await page.keyboard.press("Home");
  await expect(canvas).toHaveAttribute("data-camera", "7.400,3.400,10.800");
  await page.getByLabel("Gallery controls", { exact: true }).click();
  await expect(page.locator(".gallery-controls-panel")).toBeVisible();
  await page.mouse.click(15, page.viewportSize().height / 2);
  await expect.poll(() => page.locator(".gallery-toolbox").evaluate((element) => element.open)).toBe(false);
  await expect(canvas).toBeFocused();
  await page.keyboard.down("KeyW");
  await expect(page.locator(".spatial-stage")).toHaveClass(/is-interacting/);
  await page.keyboard.up("KeyW");
  await expect(page.locator(".spatial-stage")).not.toHaveClass(/is-interacting/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("finishes native modal exits before room travel and dismisses the phone sheet by touch", async ({ page }, info) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = errorsFrom(page), canvas = await ready(page, "prism");
  const opener = page.getByRole("button", { name: "Open gallery atlas" });
  const atlas = page.getByRole("dialog", { name: "An atlas of light." });
  await opener.click();
  await expect(atlas).toBeVisible();
  const exit = await page.evaluate(() => {
    document.querySelector('button[aria-label="Close gallery atlas"]').click();
    const dialog = document.querySelector(".gallery-atlas");
    return { open: dialog.open, state: dialog.dataset.state };
  });
  expect(exit).toEqual({ open: true, state: "closing" });
  await expect(atlas).toHaveCount(0); await expect(opener).toBeFocused();
  await opener.click();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement.closest("dialog")))).toBe(true);
  if (info.project.name === "mobile") {
    await atlas.evaluate(async (dialog) => Promise.all(dialog.getAnimations().map((animation) => animation.finished.catch(() => {}))));
    const header = await atlas.locator(".atlas-header").boundingBox();
    const client = await page.context().newCDPSession(page);
    const x = page.viewportSize().width / 2, y = header.y + header.height / 2;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + step * 24 }] });
      await page.waitForTimeout(20);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else await page.keyboard.press("Escape");
  await expect(atlas).toHaveCount(0); await expect(opener).toBeFocused();
  await opener.click();
  await atlas.getByRole("button", { name: "Enter Sky Garden", exact: true }).click();
  await expect(atlas).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-room", "garden");
  await expect(canvas).toHaveAttribute("data-room-transition", "travelling");
  await page.getByRole("button", { name: "Skip room transition" }).click();
  await expect(canvas).toHaveAttribute("data-room-transition", "idle");
  await expect(canvas).toHaveAttribute("data-camera", "7.400,3.800,10.800");
  expect(errors).toEqual([]);
});
