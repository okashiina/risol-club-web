function PulseBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[1.8rem] bg-[#f7e5df] ${className}`} />;
}

export default function Loading() {
  return (
    <div className="safe-pt min-h-screen">
      <div className="page-shell pt-4">
        <div className="surface-card flex items-center justify-between rounded-full px-4 py-3">
          <PulseBlock className="h-12 w-44 rounded-full" />
          <div className="hidden gap-2 md:flex">
            <PulseBlock className="h-10 w-24 rounded-full" />
            <PulseBlock className="h-10 w-32 rounded-full" />
          </div>
          <PulseBlock className="h-10 w-20 rounded-full" />
        </div>
      </div>

      <main className="page-shell grid gap-8 pb-16 pt-6">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="hero-surface overflow-hidden rounded-[2.9rem] p-6 sm:p-8">
            <PulseBlock className="h-9 w-48 rounded-full" />
            <PulseBlock className="mt-5 h-14 w-4/5" />
            <PulseBlock className="mt-3 h-14 w-3/4" />
            <PulseBlock className="mt-5 h-6 w-full" />
            <PulseBlock className="mt-3 h-6 w-11/12" />
            <div className="mt-8 flex gap-3">
              <PulseBlock className="h-14 w-40 rounded-full" />
              <PulseBlock className="h-14 w-36 rounded-full" />
            </div>
          </div>

          <div className="mesh-card rounded-[2.9rem] border border-[#f2c6c2] p-6">
            <PulseBlock className="mx-auto h-36 w-36 rounded-full" />
            <PulseBlock className="mx-auto mt-5 h-5 w-48" />
            <PulseBlock className="mx-auto mt-4 h-5 w-4/5" />
            <PulseBlock className="mx-auto mt-2 h-5 w-3/4" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[0, 1].map((item) => (
                <div key={item} className="rounded-[2rem] bg-white/70 p-5">
                  <PulseBlock className="h-4 w-28" />
                  <PulseBlock className="mt-4 h-8 w-3/4" />
                  <PulseBlock className="mt-3 h-5 w-full" />
                  <PulseBlock className="mt-2 h-5 w-5/6" />
                  <PulseBlock className="mt-4 h-24 w-full rounded-[1.35rem]" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
