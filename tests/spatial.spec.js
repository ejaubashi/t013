import { test, expect } from "@playwright/test";

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
      page.getByRole("heading", { name: "A room of memories." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const arrival = await canvas.getAttribute("data-camera");
    await page.getByRole("button", { name: "02 The family" }).click();
    await expect(canvas).toHaveAttribute("data-camera", "-2.650,1.750,-1.500");
    await page.getByRole("button", { name: "03 The city" }).click();
    await expect(canvas).toHaveAttribute("data-camera", "2.650,1.800,-1.600");
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
