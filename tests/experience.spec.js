import { test, expect } from "@playwright/test";

// Keep regression coverage of the saved paper experience alongside the new 3D tests.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("benno-classic", "1"));
});

test("cover, content notice, and usable local video", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const cover = page.getByRole("button", { name: "Open Benno’s memories" });
  await cover.click();
  await expect(page.getByRole("dialog")).toContainText(
    "Holocaust survivor Benno Kern",
  );
  await page.keyboard.press("Escape");
  await expect(cover).toBeFocused();
  await cover.click();
  await page.getByRole("button", { name: /Access the experience/ }).click();
  await expect(page).toHaveURL(/#chapter-1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Chapter 01: Darkening sky",
  );
  const video = page.locator("video");
  await expect
    .poll(() => video.evaluate((v) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect.poll(() => video.evaluate((v) => v.duration)).toBe(2.5);
  await expect(video).toHaveJSProperty("muted", true);
  await page
    .getByRole("button", { name: "Unmute testimony", exact: true })
    .click();
  await expect(video).toHaveJSProperty("muted", false);
  await video.evaluate((v) => v.pause());
  await page.getByRole("button", { name: "Play video", exact: true }).click();
  await expect(video).toHaveJSProperty("paused", false);
  await page.getByRole("button", { name: "All chapters", exact: true }).click();
  await expect(video).toHaveJSProperty("paused", true);
  await expect(
    page
      .getByRole("dialog", { name: "All chapters" })
      .getByRole("button", { name: /Explore chapter \d/ }),
  ).toHaveCount(6);
  expect(errors).toEqual([]);
});

test("all six chapters open with working archive navigation and deep links", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#chapter-1");
  for (let id = 1; id <= 6; id++) {
    if (id !== 1) {
      await page
        .getByRole("button", { name: "All chapters", exact: true })
        .click();
      await page
        .getByRole("button", { name: new RegExp(`Explore chapter 0${id}:`) })
        .click();
    }
    await expect(page).toHaveURL(new RegExp(`#chapter-${id}$`));
    await page
      .getByRole("button", { name: "Chapter content", exact: true })
      .click();
    const archive = page.getByRole("dialog", {
      name: `Chapter 0${id} content`,
    });
    await expect(archive).toBeVisible();
    await expect(archive.locator(".chapter-heading")).toContainText(
      `Chapter 0${id}`,
    );
    const dimensions = await archive.evaluate((el) => ({
      visible: el.clientWidth,
      total: el.scrollWidth,
    }));
    expect(dimensions.total).toBeLessThanOrEqual(dimensions.visible);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Chapter content", exact: true }),
    ).toBeFocused();
  }
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Chapter 06: The light of humanity",
  );
});

test("archive photograph carousel wraps and back-to-top scrolls its panel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#chapter-1");
  await page
    .getByRole("button", { name: "Chapter content", exact: true })
    .click();
  const archive = page.getByRole("dialog");
  await expect(archive.locator("figure img")).toHaveAttribute(
    "alt",
    "Benno’s family",
  );
  const next = page.getByRole("button", { name: "Next archival photograph" });
  await next.click();
  await expect(archive.locator("figure img")).toHaveAttribute(
    "alt",
    "A childhood in Vienna",
  );
  await next.click();
  await expect(archive.locator("figure img")).toHaveAttribute(
    "alt",
    "Panoramic view of the Hofburg Theater",
  );
  await next.click();
  await expect(archive.locator("figure img")).toHaveAttribute(
    "alt",
    "Benno’s family",
  );
  await page
    .getByRole("button", { name: "Previous archival photograph" })
    .click();
  await expect(archive.locator("figure img")).toHaveAttribute(
    "alt",
    "Panoramic view of the Hofburg Theater",
  );
  await page.getByRole("button", { name: "Back to top" }).click();
  await expect.poll(() => archive.evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Next chapter 02" }).click();
  await expect(page).toHaveURL(/#chapter-2$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("chapter progress can be cleared from the privacy panel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore all chapters" }).click();
  await page.getByRole("button", { name: /Explore chapter 03:/ }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("benno-visited")),
    ),
  ).toEqual([3]);
  await page.getByRole("button", { name: "All chapters", exact: true }).click();
  await page
    .getByRole("button", { name: "Privacy policy", exact: true })
    .click();
  await page.getByRole("button", { name: "Clear chapter history" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("benno-visited")),
  ).toBeNull();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "All chapters" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Privacy policy", exact: true }),
  ).toBeFocused();
});

test("responsive cover, local assets, language, and accessibility controls", async ({
  page,
}) => {
  const failed = [];
  page.on("response", (response) => {
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".cover-photo img")).toHaveJSProperty(
    "complete",
    true,
  );
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "English", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Accessibility settings" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Reduce motion" }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "Larger reading text" }).check();
  await expect(page.locator("html")).toHaveClass(/large-text/);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Accessibility settings" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Explore all chapters" }).click();
  const cards = page.locator(".chapter-card");
  await expect(cards).toHaveCount(6);
  for (const card of await cards.all()) {
    await expect(card).toBeVisible();
    expect((await card.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(await card.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Explore all chapters" }),
  ).toBeFocused();
  expect(failed).toEqual([]);
});

test("browser history and malformed saved progress do not break navigation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("benno-visited", "{}"));
  await page.goto("/#chapter-2");
  await page.getByRole("button", { name: "All chapters", exact: true }).click();
  await page.getByRole("button", { name: /Explore chapter 04:/ }).click();
  await expect(page).toHaveURL(/#chapter-4$/);
  await page.goBack();
  await expect(page).toHaveURL(/#chapter-2$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Chapter 02: Anschluss",
  );
  await page
    .getByRole("button", { name: "Benno’s Light", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Benno’s memories" }),
  ).toBeVisible();
});

test("sharing always exposes a copyable chapter link", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.copiedShareLink = text;
        },
      },
      configurable: true,
    });
  });
  await page.goto("/#chapter-4");
  await page.getByRole("button", { name: "All chapters", exact: true }).click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Carry the story forward." });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("textbox", { name: "Share link" })).toHaveValue(
    /#chapter-4$/,
  );
  await panel.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText(
    "Link copied. Share Benno’s story.",
  );
  expect(await page.evaluate(() => window.copiedShareLink)).toMatch(
    /#chapter-4$/,
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Share", exact: true }),
  ).toBeFocused();
});

test("sharing offers a manual copy fallback when clipboard access is denied", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("Permission denied");
        },
      },
      configurable: true,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore all chapters" }).click();
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Carry the story forward." });
  await panel.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Select the link above",
  );
});
