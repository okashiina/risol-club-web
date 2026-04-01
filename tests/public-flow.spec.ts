import path from "node:path";
import { expect, test } from "@playwright/test";

const paymentProofPath = path.resolve(
  process.cwd(),
  "..",
  "Risol Club Assets",
  "logo red transparent (no risol).png",
);

test("storefront stays public-facing and uses the requested branding", async ({ page }) => {
  await page.goto("/");

  const primaryCta = page.getByRole("link", { name: /mulai pesan|start your order/i });
  await expect(primaryCta).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/seller/i);
  await expect(page.locator("link[rel='icon']").first()).toHaveAttribute(
    "href",
    /logo-white-bg\.png\?v=1/,
  );

  const logoImage = page.getByAltText("Risol Club logo").first();
  await expect(logoImage).toHaveAttribute("src", /logo-red-transparent\.png/);
  await expect(primaryCta).toHaveCSS("color", "rgb(255, 250, 244)");
});

test("private seller path redirects cleanly to the seller login", async ({ page }) => {
  await page.goto("/club-room");
  await expect(page).toHaveURL(/\/seller\/login$/);
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
});

test("seller can log in from the private login path", async ({ page }) => {
  await page.goto("/club-room");

  await page.getByLabel("Email").fill("owner@risolclub.local");
  await page.getByLabel("Password").fill("risolclub123");

  await Promise.all([
    page.waitForURL(/\/seller$/),
    page.getByRole("button", { name: /Masuk ke dashboard/i }).click(),
  ]);

  await expect(page.locator("body")).toContainText(/Orders|Overview|Notifications/);
});

test("customer can place an order from checkout", async ({ page }) => {
  await page.goto("/checkout?product=risol-mayo");
  await page.waitForLoadState("networkidle");
  const submitButton = page.getByRole("button", { name: /kirim order - rp|submit order - rp/i });
  await expect(submitButton).toBeVisible();

  await page.getByLabel(/nama pemesan|your name/i).fill("Nadia");
  await page.getByLabel("WhatsApp").fill("081234567890");
  await page.getByLabel(/waktu pickup \/ delivery|pickup \/ delivery time/i).fill(
    "2030-06-01T10:00",
  );
  await page.getByLabel(/catatan pesanan|order notes/i).fill("Tolong dibikin hangat ya.");
  await page.getByLabel(/upload bukti transfer|upload payment proof/i).setInputFiles(
    paymentProofPath,
  );

  await Promise.all([
    page.waitForURL(/\/order\/RC-\d{4}-\d{3}\?name=Nadia$/),
    submitButton.click(),
  ]);

  await expect(
    page.getByRole("heading", { name: /order kamu sudah masuk|thanks, your order is in/i }),
  ).toBeVisible();
  await expect(page.getByText(/payment review/i)).toBeVisible();
  await expect(page.getByText(/simpan receipt ini/i)).toBeVisible();
});
