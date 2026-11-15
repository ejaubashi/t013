import { test, expect } from "@playwright/test";

// WebGL readbacks in tracing perturb the software renderer; retain failure screenshots.
test.use({ trace: "off", actionTimeout: 15000 });


async function enterGallery(page) {
  await expect(page.locator('button[aria-label="Walk in first person"]')).toBeEnabled({ timeout: 60000 });
  const entry = page.getByRole("button", { name: "Enter quietly", exact: true });
  if (await entry.isVisible()) await entry.click();
  const canvas = page.locator(".spatial-canvas canvas");
  await expect(canvas).toHaveAttribute("data-navigation", "walk");
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 45000 });
}

// The tour is the authored route through archive photographs and installations;
// its stops now stay on the floor, with no separate aerial camera mode.
async function visitStop(page, index) {
  await closeControls(page);
  await page.getByRole("button", { name: "Walk in first person", exact: true }).click();
  await page.getByRole("button", { name: "Start guided journey", exact: true }).click();
  for (let i = 0; i < index; i++) await page.getByRole("button", { name: "Next journey stop" }).click();
}

async function openControls(page) {
  const tools = page.locator(".gallery-toolbox");
  if (!(await tools.evaluate((element) => element.open))) await page.getByLabel("Gallery controls", { exact: true }).click();
}

async function closeControls(page) {
  const tools = page.locator(".gallery-toolbox");
  if (await tools.count() && await tools.evaluate((element) => element.open)) await page.getByLabel("Gallery controls", { exact: true }).click();
}

async function openAtlas(page) {
  await closeControls(page);
  await page.getByRole("button", { name: "Open gallery atlas" }).click();
}

test.describe("Gaussian-splat room", () => {
  test.setTimeout(120000);
  test.use({ reducedMotion: "reduce" });

  test("renders real splats, navigates, and can return to the saved cover", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await enterGallery(page);
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-scene", "gaussian-archive", {
      timeout: 45000,
    });
    expect(Number(await canvas.getAttribute("data-splats"))).toBeGreaterThan(
      50000,
    );
    await expect(page.getByRole("navigation", { name: "Move between rooms" })).toContainText("Nocturne Hall");
    await expect.poll(async () => Number(await canvas.getAttribute("data-drawn-splats")), { timeout: 45000 }).toBeGreaterThan(50000);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const arrival = await canvas.getAttribute("data-camera");
    await visitStop(page, 1);
    await expect(canvas).toHaveAttribute("data-camera", "-4.000,1.720,-3.600");
    await visitStop(page, 2);
    await expect(canvas).toHaveAttribute("data-camera", "5.250,1.720,-4.100");
    await visitStop(page, 0);
    await expect(canvas).toHaveAttribute("data-camera", "5.800,1.720,5.900");
    await openControls(page);
    const lighting = page.getByRole("button", { name: "After-hours lighting" });
    await lighting.click();
    await expect(lighting).toHaveAttribute("aria-pressed", "false");
    await expect(canvas).toHaveAttribute("data-lighting", "day");
    await lighting.click();
    await expect(canvas).toHaveAttribute("data-lighting", "night");
    await closeControls(page);
    await page.getByRole("button", { name: "Open Benno’s memories" }).click();
    await expect(page.getByRole("dialog")).toContainText("Before you begin.");
    await page.keyboard.press("Escape");
    await openControls(page);
    await page.getByRole("button", { name: "Reset room view" }).click();
    await expect(canvas).toHaveAttribute("data-camera", arrival);
    await canvas.focus();
    await page.keyboard.down("KeyW");
    await expect
      .poll(() => canvas.getAttribute("data-camera"))
      .not.toBe(arrival);
    await page.keyboard.up("KeyW");
    await openControls(page);
    await page.getByRole("button", { name: "Reset room view" }).click();
    await expect(canvas).toHaveAttribute("data-camera", arrival);
    await openControls(page);
    const left = page.getByRole("button", { name: "Move left", exact: true });
    await left.focus();
    await page.keyboard.down("Space");
    await expect
      .poll(() => canvas.getAttribute("data-camera"))
      .not.toBe(arrival);
    await page.keyboard.up("Space");
    await openControls(page);
    await page.getByRole("button", { name: "Room navigation help" }).click();
    await expect(page.locator(".room-help")).toContainText(
      "not a capture of a historical location",
    );
    await page.getByRole("button", { name: "Close navigation help" }).click();
    await closeControls(page);
    await page
      .getByRole("button", { name: "Original view", exact: true })
      .click();
    await expect(page.locator(".cover-photo img")).toBeVisible();
    await expect(canvas).toHaveCount(0);
    await closeControls(page);
    await page.getByRole("button", { name: "Open Benno’s memories" }).click();
    await page.getByRole("button", { name: /Access the experience/ }).click();
    await expect(page).toHaveURL(/#chapter-1$/);
    expect(errors).toEqual([]);
  });

  test("transforms the mirror installation and explores the canopy", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/");
    await enterGallery(page);
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-art-form", "bloom", { timeout: 45000 });
    expect(Number(await canvas.getAttribute("data-mirrors"))).toBeGreaterThan(2000);
    await expect(page.getByRole("navigation", { name: "Room viewpoints" })).toHaveCount(0);
    await openControls(page);
    const transform = page.getByRole("button", { name: "Transform the installation" });
    await transform.click();
    await expect(transform).toHaveAttribute("data-form", "ribbon");
    await expect(canvas).toHaveAttribute("data-art-form", "ribbon");
    await expect(canvas).toHaveAttribute("data-art-phase", "0.000");
    await transform.click();
    await expect(transform).toHaveAttribute("data-form", "constellation");
    await expect(canvas).toHaveAttribute("data-art-form", "constellation");
    await expect(canvas).toHaveAttribute("data-art-phase", "1.000");
    await transform.click();
    await expect(canvas).toHaveAttribute("data-art-form", "bloom");
    await expect(canvas).toHaveAttribute("data-art-phase", "2.000");
    await visitStop(page, 4);
    await expect(canvas).toHaveAttribute("data-camera", "-7.400,1.720,7.700");
    await openControls(page);
    await page.getByRole("button", { name: "After-hours lighting" }).click();
    await expect(canvas).toHaveAttribute("data-lighting", "day");
    expect(errors).toEqual([]);
  });

  test("guides all twelve journey stops across four rooms and yields to manual navigation", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/");
    await enterGallery(page);
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-art-form", "bloom", { timeout: 45000 });
    await closeControls(page);
    await page.getByRole("button", { name: "Start guided journey" }).click();
    await expect(canvas).toHaveAttribute("data-journey", "0");
    const guide = page.getByRole("complementary", { name: "Guided journey" });
    await expect(guide).toContainText("Light, taking shape.");
    const route = ["pavilion", "pavilion", "pavilion", "pavilion", "pavilion", "orbit", "orbit", "garden", "garden", "prism", "prism", "pavilion"];
    for (let index = 1; index < route.length; index++) {
      await page.getByRole("button", { name: "Next journey stop" }).click();
      await expect(canvas).toHaveAttribute("data-journey", String(index));
      await expect(canvas).toHaveAttribute("data-room", route[index]);
    }
    await expect(canvas).toHaveAttribute("data-camera", "7.400,1.720,10.800");
    await expect(canvas).toHaveAttribute("data-lighting", "night");
    await expect(canvas).toHaveAttribute("data-art-form", "bloom");
    await page.getByRole("button", { name: "Next journey stop" }).click();
    await expect(guide).toHaveCount(0);
    await expect(canvas).toHaveAttribute("data-journey", "stopped");
    await closeControls(page);
    await page.getByRole("button", { name: "Start guided journey" }).click();
    await page.getByRole("button", { name: "Walk in first person", exact: true }).click();
    await expect(guide).toHaveCount(0);
    expect((await canvas.getAttribute("data-camera")).split(",")[1]).toBe("1.720");
    await expect(canvas).toHaveAttribute("data-journey", "stopped");
  });

  test("explores distinct rooms, uses a doorway, and returns to the photographic archive", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto("/");
    await enterGallery(page);
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-room", "pavilion", { timeout: 45000 });
    await openAtlas(page);
    const roomNav = page.getByRole("navigation", { name: "Gallery rooms" });
    await expect(roomNav.getByRole("button")).toHaveCount(4);
    const orbit = roomNav.getByRole("button", { name: "Enter Scarlet Room", exact: true });
    await expect(orbit).toBeEnabled();
    await orbit.focus();
    await page.keyboard.press("Enter");
    await expect(canvas).toHaveAttribute("data-room", "orbit");
    await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
    await openAtlas(page);
    await expect(orbit).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Transform the installation" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "View family photograph" })).toHaveCount(0);
    await visitStop(page, 6);
    await expect(canvas).toHaveAttribute("data-camera", "0.000,1.720,10.200");
    await openControls(page);
    await page.getByRole("button", { name: "Reset room view" }).click();
    await expect(canvas).toHaveAttribute("data-room", "orbit");
    await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
    await page.getByRole("button", { name: "Door to Nocturne Hall", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-room", "pavilion");
    await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
    await openAtlas(page);
    await roomNav.getByRole("button", { name: "Enter Night Garden", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-room", "garden");
    await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
    await expect(canvas).toHaveAttribute("data-petals", "1100");
    await openAtlas(page);
    await expect(roomNav.getByRole("button", { name: "Enter Night Garden", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await visitStop(page, 8);
    await expect(canvas).toHaveAttribute("data-camera", "-8.000,1.720,5.800");
    await openControls(page);
    await page.getByRole("button", { name: "After-hours lighting" }).click();
    await expect(canvas).toHaveAttribute("data-lighting", "day");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closeControls(page);
    await page.getByRole("button", { name: "Start guided journey" }).click();
    await expect(canvas).toHaveAttribute("data-room", "pavilion");
    await expect(canvas).toHaveAttribute("data-journey", "0");
    await openAtlas(page);
    await roomNav.getByRole("button", { name: "Enter Night Garden", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-journey", "stopped");
    await expect(page.getByRole("complementary", { name: "Guided journey" })).toHaveCount(0);
    await openAtlas(page);
    await roomNav.getByRole("button", { name: "Enter Nocturne Hall", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-room", "pavilion");
    await expect.poll(async () => Number(await canvas.getAttribute("data-drawn-splats")), { timeout: 45000 }).toBeGreaterThan(50000);
    await visitStop(page, 1);
    await page.getByRole("button", { name: "View family photograph" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "The family" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("selects photographs in 3D, supports keyboard access, and enters the testimony", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await enterGallery(page);
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-art-form", "bloom", { timeout: 45000 });
    await visitStop(page, 1);
    await expect(canvas).toHaveAttribute("data-camera", "-4.000,1.720,-3.600");
    const { width, height } = page.viewportSize();
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.down();
    await page.mouse.move(width / 2 + 50, height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await visitStop(page, 1);
    await expect(canvas).toHaveAttribute("data-camera", "-4.000,1.720,-3.600");
    await page.getByRole("button", { name: "View artwork without interface" }).click();
    await page.mouse.click(width / 2, height / 2);
    const reader = page.getByRole("dialog");
    await expect(reader.getByRole("heading", { name: "The family" })).toBeVisible();
    await expect(reader.locator("img")).toHaveAttribute("src", /benno-family.webp$/);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement.closest("dialog")))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(reader).toHaveCount(0);
    const marker = page.getByRole("button", { name: "View family photograph" });
    await marker.focus();
    await page.keyboard.press("Enter");
    await expect(reader).toBeVisible();
    await reader.getByRole("button", { name: "View in the room" }).click();
    await expect(reader).toHaveCount(0);
    await visitStop(page, 3);
    await expect(canvas).toHaveAttribute("data-camera", "0.100,1.720,-4.400");
    await page.mouse.click(width / 2, height / 2);
    await expect(reader.getByRole("heading", { name: "Benno Kern" })).toBeVisible();
    await reader.getByRole("button", { name: "Listen to Benno" }).click();
    await expect(page.getByRole("dialog")).toContainText("Before you begin.");
    expect(errors).toEqual([]);
  });

  test("loads a local capture and preserves the room when a file is invalid", async ({
    page,
  }) => {
    await page.goto("/");
    await enterGallery(page);
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-scene", "gaussian-archive", {
      timeout: 45000,
    });
    const input = page.getByLabel("Captured scene file");
    await input.setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a scene"),
    });
    await expect(page.getByRole("alert")).toContainText(
      "Choose a .spz, .splat, or .ply",
    );
    await expect(canvas).toHaveAttribute("data-scene", "gaussian-archive");
    const bytes = Buffer.alloc(81 * 32);
    for (let i = 0; i < 81; i++) {
      const offset = i * 32;
      bytes.writeFloatLE(((i % 9) - 4) * 0.2, offset);
      bytes.writeFloatLE((Math.floor(i / 9) - 4) * 0.2, offset + 4);
      bytes.writeFloatLE(0, offset + 8);
      for (const axis of [12, 16, 20]) bytes.writeFloatLE(0.09, offset + axis);
      bytes.set([220, 160, 100, 255, 255, 128, 128, 128], offset + 24);
    }
    await input.setInputFiles({
      name: "test-capture.splat",
      mimeType: "application/octet-stream",
      buffer: bytes,
    });
    await expect(page.locator(".room-view-label strong")).toHaveText(
      "test-capture.splat",
      { timeout: 30000 },
    );
    await expect(canvas).toHaveAttribute("data-splats", "81");
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Transform the installation" })).toHaveCount(0);
    await openControls(page);
    await page
      .getByRole("button", { name: "Flip capture orientation" })
      .click();
    await openControls(page);
    await page.getByRole("button", { name: "Reset room view" }).click();
    await expect(canvas).toHaveAttribute("data-camera", "0.000,0.500,5.500");
  });

  test("opens the room atlas, shapes the prism spectrum, and restores focus after art view", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript(() => sessionStorage.setItem("benno-classic", "1"));
    await page.goto("/?view=spatial&room=prism");
    await enterGallery(page);
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-room", "prism", { timeout: 45000 });
    await expect(canvas).toHaveAttribute("data-artwork", "spectral-crystals");
    await expect(canvas).toHaveAttribute("data-crystals", "7");
    await expect(canvas).toHaveAttribute("data-camera", "7.100,1.720,7.400");
    await openAtlas(page);
    const atlas = page.getByRole("dialog", { name: "An atlas of light." });
    await expect(atlas).toBeVisible();
    await expect(atlas.getByRole("navigation", { name: "Gallery rooms" }).getByRole("button")).toHaveCount(4);
    await expect(atlas.getByRole("button", { name: "Enter Obsidian Room", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement.closest("dialog")))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(atlas).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open gallery atlas" })).toBeFocused();
    await openControls(page);
    const spectrum = page.getByRole("slider", { name: "Spectrum position" });
    await spectrum.focus();
    await page.keyboard.press("End");
    await expect(canvas).toHaveAttribute("data-spectrum", "1.00");
    await page.keyboard.press("Home");
    await expect(canvas).toHaveAttribute("data-spectrum", "0.00");
    await page.keyboard.press("Escape");
    const focus = page.getByRole("button", { name: "View artwork without interface" });
    await focus.click();
    await expect(page.getByRole("button", { name: "Return to gallery interface" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open gallery atlas" })).toBeHidden();
    await expect(canvas).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(focus).toBeFocused();
    await expect(page.getByRole("button", { name: "Open gallery atlas" })).toBeVisible();
    await openAtlas(page);
    const garden = atlas.getByRole("button", { name: "Enter Night Garden", exact: true });
    await garden.focus(); await page.keyboard.press("Enter");
    await expect(canvas).toHaveAttribute("data-room", "garden");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test("graphics failure provides a usable original experience", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (
          type === "webgl" ||
          type === "webgl2" ||
          type === "experimental-webgl"
        )
          return null;
        return original.call(this, type, ...args);
      };
    });
    await page.goto("/");
    await expect(page.getByRole("alert")).toContainText(
      "could not start the 3D room",
      { timeout: 15000 },
    );
    await page
      .getByRole("button", { name: "Open original view", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Open Benno’s memories" }),
    ).toBeVisible();
    await closeControls(page);
    await page.getByRole("button", { name: "Open Benno’s memories" }).click();
    await expect(page.getByRole("dialog")).toContainText("Before you begin.");
  });
});
