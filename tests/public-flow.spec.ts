import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const paymentProofPath = path.resolve(
  process.cwd(),
  "..",
  "Risol Club Assets",
  "logo red transparent (no risol).png",
);
const storeFilePath = path.resolve(process.cwd(), "data", "store.json");

test.describe.configure({ mode: "serial" });

async function loginSeller(page: import("@playwright/test").Page) {
  await page.goto("/club-room");
  await page.getByLabel("Email").fill("owner@risolclub.local");
  await page.getByLabel("Password").fill("risolclub123");

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/seller"),
    page.getByRole("button", { name: /Masuk ke dashboard/i }).click(),
  ]);
}

async function patchStorePoState(
  updater: (store: Record<string, unknown>) => Record<string, unknown>,
) {
  const raw = await readFile(storeFilePath, "utf8");
  const store = JSON.parse(raw) as Record<string, unknown>;
  const next = updater(store);
  await writeFile(storeFilePath, JSON.stringify(next, null, 2), "utf8");
}

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
  await expect(logoImage).toHaveAttribute("src", /logo-original\.png/);
  await expect(primaryCta).toHaveCSS("color", "rgb(255, 250, 244)");
});

test("private seller path redirects cleanly to the seller login", async ({ page }) => {
  await page.goto("/club-room");
  await expect(page).toHaveURL(/\/seller\/login$/);
  await expect(page.getByRole("heading", { name: "Masuk" })).toBeVisible();
});

test("seller can log in from the private login path", async ({ page }) => {
  await loginSeller(page);

  await expect(page.locator("body")).toContainText(/Orders|Overview|Notifications/);
});

test("customer can place an order from checkout", async ({ page }) => {
  await patchStorePoState((store) => ({
    ...store,
    poSettings: {
      manualOverride: "open",
      timezone: "Asia/Jakarta",
      updatedAt: new Date().toISOString(),
    },
  }));

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

test("closed PO redirects customers to the notice page and captures waitlist data", async ({
  page,
  request,
}) => {
  await patchStorePoState((store) => ({
    ...store,
    poSettings: {
      manualOverride: "closed",
      timezone: "Asia/Jakarta",
      updatedAt: new Date().toISOString(),
    },
  }));

  await page.goto("/checkout?product=risol-mayo");
  await expect(page).toHaveURL(/\/po-notice\?product=risol-mayo$/);
  await expect(page.getByRole("heading", { name: /belum nerima PO|not taking pre-orders/i })).toBeVisible();

  await page.getByLabel(/Nama kamu|Your name/i).fill("Rara");
  await page.getByLabel("Email").fill("rara@example.com");
  await page.getByLabel(/Nomor WhatsApp|WhatsApp number/i).fill("081234567899");
  await page.getByRole("button", { name: /Kabarin aku pas PO buka|Notify me when PO opens/i }).click();

  await expect(page.locator("body")).toContainText(/udah masuk daftar|udah masuk list|on the list/i);

  const apiResponse = await request.post("/api/order", {
    multipart: {
      locale: "id",
      customerName: "Rara",
      customerWhatsapp: "081234567899",
      preorderDate: "2030-04-10T10:00",
      items: JSON.stringify([
        {
          productId: "prod-1",
          productName: "Smoked Beef Mayo",
          quantity: 1,
          unitPrice: 30000,
          variantType: "fried",
          variantLabel: "Fried",
        },
      ]),
    },
  });
  expect(apiResponse.status()).toBe(409);

  await patchStorePoState((store) => ({
    ...store,
    poSettings: {
      manualOverride: null,
      timezone: "Asia/Jakarta",
      scheduledStartAt: "2030-04-10T03:00:00.000Z",
      scheduledEndAt: "2030-04-10T17:00:00.000Z",
      cycleId: "test-cycle-apr-2030",
      updatedAt: new Date().toISOString(),
    },
  }));

  await page.goto("/po-notice");
  await expect(page.locator("body")).toContainText(/10 April 2030|2030/);
});
