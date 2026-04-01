function SellerLoadingCard({ className }: { className?: string }) {
  return (
    <div className={`surface-card animate-pulse rounded-[2rem] bg-[#fff4f0] ${className ?? ""}`} />
  );
}

export default function SellerDashboardLoading() {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SellerLoadingCard className="h-40" />
        <SellerLoadingCard className="h-40" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <SellerLoadingCard key={item} className="h-32" />
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <SellerLoadingCard className="h-[24rem]" />
        <SellerLoadingCard className="h-[24rem]" />
      </section>
    </div>
  );
}
