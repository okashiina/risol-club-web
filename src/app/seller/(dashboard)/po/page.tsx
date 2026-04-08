import { ActionButton } from "@/components/action-button";
import {
  clearPoScheduleAction,
  savePoScheduleAction,
  updatePoModeAction,
} from "@/app/seller/actions";
import {
  formatPoDateTime,
  formatPoWindow,
  getPoStateLabel,
  isoToWibInput,
} from "@/lib/po";
import { readSellerPoData } from "@/lib/store-projections";

export default async function SellerPoPage() {
  const { poSettings, poState, subscribers } = await readSellerPoData();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card rounded-[2rem] p-6">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            PO control
          </p>
          <h1 className="mt-4 font-display text-4xl text-[color:var(--brand-900)]">
            Buka, tutup, atau jadwalkan PO dengan lebih rapi
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ink-700)]">
            Menu tetap bisa tampil seperti biasa, tapi checkout cuma terbuka saat PO lagi
            aktif. Saat PO tutup, customer akan otomatis pindah ke halaman notice dan bisa
            daftar waitlist.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.6rem] bg-white p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Status saat ini</p>
              <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                {poState.isOpen ? "OPEN" : "CLOSED"}
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                {getPoStateLabel(poState.reason, "id")}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-white p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Window aktif</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[color:var(--brand-900)]">
                {formatPoWindow(
                  poSettings.scheduledStartAt,
                  poSettings.scheduledEndAt,
                  "id",
                )}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-white p-4">
              <p className="text-sm text-[color:var(--ink-700)]">Waitlist</p>
              <p className="mt-2 text-2xl font-black text-[color:var(--brand-900)]">
                {subscribers.length}
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-700)]">
                subscriber siap dikabari saat batch berikutnya dibuka
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6">
          <p className="font-note text-lg text-[color:var(--brand-900)]">
            live command
          </p>
          <h2 className="mt-3 font-display text-2xl text-[color:var(--brand-900)]">
            Manual override
          </h2>
          <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
            Pakai tombol ini kalau kamu mau langsung buka atau tutup checkout sekarang juga,
            tanpa mengubah menu aktif.
          </p>

          <div className="mt-5 grid gap-3">
            <form action={updatePoModeAction}>
              <input type="hidden" name="manualOverride" value="open" />
              <ActionButton className="btn-primary w-full px-5 py-4 font-bold">
                Open now
              </ActionButton>
            </form>
            <form action={updatePoModeAction}>
              <input type="hidden" name="manualOverride" value="closed" />
              <ActionButton className="w-full rounded-full border border-[color:var(--paper-300)] bg-white px-5 py-4 font-bold text-[color:var(--brand-900)]">
                Close now
              </ActionButton>
            </form>
            <form action={updatePoModeAction}>
              <input type="hidden" name="manualOverride" value="follow_schedule" />
              <ActionButton className="w-full rounded-full border border-[color:var(--paper-300)] bg-[color:var(--paper-100)] px-5 py-4 font-bold text-[color:var(--brand-900)]">
                Follow schedule
              </ActionButton>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="surface-card rounded-[2rem] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
                Schedule editor
              </p>
              <h2 className="mt-4 font-display text-3xl text-[color:var(--brand-900)]">
                Simpan satu window PO aktif
              </h2>
            </div>
            <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#fff8ef,#fff3e8)] px-4 py-3 text-right shadow-[0_18px_40px_rgba(231,169,61,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                Preview
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[color:var(--brand-900)]">
                {formatPoWindow(
                  poSettings.scheduledStartAt,
                  poSettings.scheduledEndAt,
                  "id",
                )}
              </p>
            </div>
          </div>

          <form action={savePoScheduleAction} className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="scheduledStartAt">
                  Mulai buka PO
                </label>
                <input
                  id="scheduledStartAt"
                  name="scheduledStartAt"
                  type="datetime-local"
                  className="field"
                  defaultValue={isoToWibInput(poSettings.scheduledStartAt)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="scheduledEndAt">
                  Tutup lagi pada
                </label>
                <input
                  id="scheduledEndAt"
                  name="scheduledEndAt"
                  type="datetime-local"
                  className="field"
                  defaultValue={isoToWibInput(poSettings.scheduledEndAt)}
                  required
                />
              </div>
            </div>

            <div className="rounded-[1.6rem] bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--brand-900)]">
                WIB summary
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--ink-700)]">
                Window berikutnya akan dibaca dalam timezone Asia/Jakarta. Saat waktunya tiba,
                checkout akan otomatis terbuka dan cron akan kirim email pembuka ke waitlist.
              </p>
              <p className="mt-3 font-semibold text-[color:var(--brand-900)]">
                Next open: {formatPoDateTime(poState.nextOpenAt ?? poSettings.scheduledStartAt)}
              </p>
              <p className="mt-1 font-semibold text-[color:var(--brand-900)]">
                Next close: {formatPoDateTime(poState.nextCloseAt ?? poSettings.scheduledEndAt)}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <ActionButton className="btn-primary px-5 py-4 font-bold">
                Save PO schedule
              </ActionButton>
            </div>
          </form>

          <form action={clearPoScheduleAction} className="mt-3">
            <ActionButton className="rounded-full border border-[color:var(--paper-300)] bg-white px-5 py-4 font-bold text-[color:var(--brand-900)]">
              Clear schedule
            </ActionButton>
          </form>
        </div>

        <aside className="surface-card rounded-[2rem] p-6">
          <p className="pill bg-[color:var(--paper-100)] text-[color:var(--brand-900)]">
            Waitlist
          </p>
          <h2 className="mt-4 font-display text-3xl text-[color:var(--brand-900)]">
            Orang-orang yang minta dikabari
          </h2>
          <p className="mt-3 text-sm leading-7 text-[color:var(--ink-700)]">
            Begitu kamu simpan jadwal baru atau buka PO sekarang, email Resend akan dikirim
            ke subscriber yang belum pernah dikabari untuk cycle tersebut.
          </p>

          <div className="mt-5 grid gap-3">
            {subscribers.length ? (
              subscribers.slice(0, 8).map((subscriber) => (
                <div
                  key={subscriber.id}
                  className="rounded-[1.6rem] border border-[color:var(--paper-300)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-[color:var(--brand-900)]">
                        {subscriber.name}
                      </p>
                      <p className="mt-1 truncate text-sm text-[color:var(--ink-700)]">
                        {subscriber.email}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--ink-700)]">
                        {subscriber.whatsapp}
                      </p>
                    </div>
                    <div className="text-right text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--ink-700)]">
                      <p>Join</p>
                      <p className="mt-1 normal-case tracking-normal">
                        {formatPoDateTime(subscriber.createdAt, "id")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.6rem] bg-white p-5 text-sm leading-7 text-[color:var(--ink-700)]">
                Belum ada yang masuk waitlist. Saat customer coba order ketika PO tutup, mereka
                akan diarahkan ke halaman notice dan bisa isi form notifikasi di sana.
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
