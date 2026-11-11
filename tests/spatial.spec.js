import { test, expect } from "@playwright/test";

// Trace screencasts force expensive WebGL readbacks in software Chromium.
// Keep action/DOM traces and the usual screenshot on failure.
test.use({
  trace: { mode: "retain-on-failure", screenshots: false, snapshots: true },
});

test.describe("Gaussian-splat room", () => {
  test.setTimeout(90000);
  test.use({ reducedMotion: "reduce" });

  test("renders real splats, navigates, and can return to the saved cover", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-scene", "gaussian-archive", {
      timeout: 45000,
    });
    expect(Number(await canvas.getAttribute("data-splats"))).toBeGreaterThan(
      50000,
    );
    await expect(
      page.getByRole("heading", { name: "Some light never leaves." }),
    ).toBeVisible();
    await expect.poll(async () => Number(await canvas.getAttribute("data-drawn-splats")), { timeout: 45000 }).toBeGreaterThan(50000);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const arrival = await canvas.getAttribute("data-camera");
    await page.getByRole("button", { name: "02 The family" }).click();
    await expect(canvas).toHaveAttribute("data-camera", "-4.000,2.450,-3.600");
    await page.getByRole("button", { name: "03 The city" }).click();
    await expect(canvas).toHaveAttribute("data-camera", "4.900,2.500,-3.650");
    await page.getByRole("button", { name: "05 The light" }).click();
    await expect(canvas).toHaveAttribute("data-camera", "5.800,3.400,5.900");
    const lighting = page.getByRole("button", { name: "After-hours lighting" });
    await lighting.click();
    await expect(lighting).toHaveAttribute("aria-pressed", "true");
    await expect(canvas).toHaveAttribute("data-lighting", "night");
    await lighting.click();
    await expect(canvas).toHaveAttribute("data-lighting", "day");
    await page.getByRole("button", { name: "Open Benno’s memories" }).click();
    await expect(page.getByRole("dialog")).toContainText("Before you begin.");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Reset room view" }).click();
    await expect(canvas).toHaveAttribute("data-camera", arrival);
    await canvas.focus();
    await page.keyboard.down("KeyW");
    await expect
      .poll(() => canvas.getAttribute("data-camera"))
      .not.toBe(arrival);
    await page.keyboard.up("KeyW");
    await page.getByRole("button", { name: "Reset room view" }).click();
    await expect(canvas).toHaveAttribute("data-camera", arrival);
    const left = page.getByRole("button", { name: "Move left", exact: true });
    await left.focus();
    await page.keyboard.down("Space");
    await expect
      .poll(() => canvas.getAttribute("data-camera"))
      .not.toBe(arrival);
    await page.keyboard.up("Space");
    await page.getByRole("button", { name: "Room navigation help" }).click();
    await expect(page.locator(".room-help")).toContainText(
      "not a capture of a historical location",
    );
    await page.getByRole("button", { name: "Close navigation help" }).click();
    await page
      .getByRole("button", { name: "Original view", exact: true })
      .click();
    await expect(page.locator(".cover-photo img")).toBeVisible();
    await expect(canvas).toHaveCount(0);
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
    const canvas = page.locator(".spatial-canvas canvas");
    await expect(canvas).toHaveAttribute("data-art-form", "ribbon", { timeout: 45000 });
    expect(Number(await canvas.getAttribute("data-mirrors"))).toBeGreaterThan(2000);
    await expect(page.getByRole("navigation", { name: "Room viewpoints" }).getByRole("button")).toHaveCount(6);
    const transform = page.getByRole("button", { name: "Transform the installation" });
    await transform.click();
    await expect(transform).toHaveAttribute("aria-pressed", "true");
    await expect(canvas).toHaveAttribute("data-art-form", "constellation");
    await expect(canvas).toHaveAttribute("data-art-phase", "1.000");
    await transform.click();
    await expect(canvas).toHaveAttribute("data-art-form", "ribbon");
    await expect(canvas).toHaveAttribute("data-art-phase", "0.000");
    await page.getByRole("button", { name: "06 The canopy" }).click();
    await expect(canvas).toHaveAttribute("data-camera", "6.700,6.800,7.700");
    await page.getByRole("button", { name: "After-hours lighting" }).click();
    await expect(canvas).toHaveAttribute("data-lighting", "night");
    expect(errors).toEqual([]);
  });

  test("loads a local capture and preserves the room when a file is invalid", async ({
    page,
  }) => {
    await page.goto("/");
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
    await page
      .getByRole("button", { name: "Flip capture orientation" })
      .click();
    await page.getByRole("button", { name: "Reset room view" }).click();
    await expect(canvas).toHaveAttribute("data-camera", "0.000,0.500,5.500");
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
    await page.getByRole("button", { name: "Open Benno’s memories" }).click();
    await expect(page.getByRole("dialog")).toContainText("Before you begin.");
  });
});
