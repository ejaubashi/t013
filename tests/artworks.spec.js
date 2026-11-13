import { test, expect } from "@playwright/test";

test.use({ trace: "off" });

const works = [
  { id: "monet-waterloo", title: "Waterloo Bridge, Effect of Fog", room: "pavilion", z: "-4.600" },
  { id: "friedrich-sailing", title: "On a Sailing Ship", room: "pavilion", z: "3.600" },
  { id: "kandinsky-composition", title: "Composition VI", room: "orbit", z: "-4.600" },
  { id: "kandinsky-winter", title: "Winter Landscape", room: "orbit", z: "3.600" },
  { id: "monet-garden", title: "Corner of the Garden at Montgeron", room: "garden", z: "-4.600" },
  { id: "vangogh-lilac", title: "Lilac Bush", room: "garden", z: "3.600" },
  { id: "matisse-red-room", title: "The Red Room (Harmony in Red)", room: "prism", z: "-4.600" },
  { id: "cezanne-still-life", title: "Still Life with a Curtain", room: "prism", z: "3.600" },
];

async function ready(page, motion = "reduce") {
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto("/?view=spatial");
  const canvas = page.locator(".spatial-canvas canvas");
  await expect(canvas).toHaveAttribute("data-motion", "idle", { timeout: 60000 });
  await expect(page.getByRole("button", { name: "Browse wall artworks" })).toBeEnabled({ timeout: 45000 });
  return canvas;
}

function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  return errors;
}

test("filters the collection, reads labels, enlarges and pans an uncropped painting, and restores focus", async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = collectErrors(page);
  await ready(page);
  const opener = page.getByRole("button", { name: "Browse wall artworks" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "The art collection.", exact: true })).toBeVisible();
  await expect(dialog.locator(".art-collection-card")).toHaveCount(8);
  await dialog.getByRole("group", { name: "Filter artworks by room" }).getByRole("button", { name: "Sky Garden", exact: true }).click();
  await expect(dialog.locator(".art-collection-card")).toHaveCount(2);
  const card = dialog.getByRole("button", { name: "Inspect Lilac Bush by Vincent van Gogh", exact: true });
  await card.click();
  await expect(dialog.getByRole("heading", { name: "Lilac Bush", exact: true })).toBeFocused();
  await expect(dialog.getByRole("region", { name: "Artwork information" })).toContainText("Vincent van Gogh");
  await expect(dialog.locator("dl")).toContainText("1889");
  await expect(dialog.locator("dl")).toContainText("Oil on canvas");
  await expect(dialog.locator("dl")).toContainText("State Hermitage Museum");
  const media = dialog.locator(".artwork-media"), image = media.locator("img");
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(1000);
  expect(await image.evaluate((element) => getComputedStyle(element).objectFit)).toBe("contain");
  await expect(dialog.getByRole("link", { name: "Source image" })).toHaveAttribute("href", /github\.com\/pmilovanov\/hermitage-art\/blob\/b8ead49/);
  await dialog.getByRole("button", { name: "Zoom artwork" }).click();
  await expect(media).toBeFocused();
  await expect.poll(() => media.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  const box = await media.boundingBox();
  const start = { x: box.x + box.width * 0.7, y: box.y + 100 };
  if (info.project.name === "mobile") {
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    for (let step = 1; step <= 6; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x - step * 15, y: start.y }] });
      await page.waitForTimeout(20);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(start.x - 100, start.y, { steps: 6 }); await page.mouse.up();
  }
  await expect.poll(() => media.evaluate((element) => element.scrollLeft)).toBeGreaterThan(40);
  await dialog.getByRole("button", { name: "Fit artwork" }).click();
  await expect(media).not.toHaveClass(/is-zoomed/);
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("heading", { name: "Corner of the Garden at Montgeron", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Previous artwork" }).click();
  await expect(dialog.getByRole("heading", { name: "Lilac Bush", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Back to art collection" }).click();
  await expect(card).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("visits and physically selects all eight paintings on the four gallery walls", async ({ page }, info) => {
  test.setTimeout(240000);
  const errors = collectErrors(page), canvas = await ready(page);
  await page.getByRole("button", { name: "Browse wall artworks" }).click();
  await page.getByRole("button", { name: "Inspect Waterloo Bridge, Effect of Fog by Claude Monet", exact: true }).click();
  for (let index = 0; index < works.length; index++) {
    const work = works[index], dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: work.title, exact: true })).toBeVisible();
    await expect.poll(() => dialog.locator(".artwork-media img").evaluate((element) => element.naturalWidth)).toBeGreaterThan(1000);
    await dialog.getByRole("button", { name: "View on the wall" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(canvas).toHaveAttribute("data-room", work.room);
    await expect(canvas).toHaveAttribute("data-wall-artworks", "2");
    await expect(canvas).toHaveAttribute("data-artwork-view", work.id);
    await expect(canvas).toHaveAttribute("data-motion", "idle");
    await expect(canvas).toHaveAttribute("data-camera", `-4.500,3.350,${work.z}`);
    const { width, height } = page.viewportSize(), point = { x: width / 2, y: height / 2 };
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, point)).toBe("CANVAS");
    if (info.project.name === "mobile") await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await expect(dialog.getByRole("heading", { name: work.title, exact: true })).toBeVisible();
    if (index < works.length - 1) await dialog.getByRole("button", { name: "Next artwork" }).click();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(canvas).toBeFocused();
  expect(errors).toEqual([]);
});

test("closes the artwork reader before a fluid room transfer and supports keyboard painting markers", async ({ page }) => {
  test.setTimeout(120000);
  const errors = collectErrors(page), canvas = await ready(page, "no-preference");
  await page.getByRole("button", { name: "Browse wall artworks" }).click();
  await page.getByRole("button", { name: "Inspect Composition VI by Wassily Kandinsky", exact: true }).click();
  await page.getByRole("button", { name: "View on the wall" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-transition-route", "pavilion:orbit");
  await expect(canvas).toHaveAttribute("data-room-transition", "travelling");
  await page.getByRole("button", { name: "Skip room transition" }).click();
  await expect(canvas).toHaveAttribute("data-room-transition", "idle");
  await expect(canvas).toHaveAttribute("data-camera", "-4.500,3.350,-4.600");
  const marker = page.getByRole("button", { name: "View Composition VI by Wassily Kandinsky", exact: true });
  await marker.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Composition VI", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0); await expect(marker).toBeFocused();
  expect(errors).toEqual([]);
});
