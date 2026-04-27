/** Skeleton shown by Next.js while the recipe read view fetches data. */
export default function RecipeLoading() {
  const skel: React.CSSProperties = {
    backgroundColor: "var(--bg-muted)",
    borderRadius: "var(--radius-md)",
  };

  return (
    <div
      style={{
        maxWidth: "var(--container-app, 1280px)",
        margin: "0 auto",
        padding: "24px 24px 64px",
      }}
    >
      {/* Hero */}
      <div
        className="aspect-[4/3] md:aspect-[16/9] skel"
        style={{
          ...skel,
          width: "100%",
          borderRadius: "var(--radius-xl)",
          marginBottom: 32,
        }}
      />

      {/* Content + sidebar layout */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr", gap: 40 }}
        className="md:grid-cols-[1fr_260px]"
      >
        {/* Main column */}
        <div>
          <div className="skel" style={{ ...skel, height: 44, width: "55%", marginBottom: 16 }} />
          {[90, 100, 75].map((w, i) => (
            <div key={i} className="skel" style={{ ...skel, height: 16, width: `${w}%`, marginBottom: 8 }} />
          ))}
          <div style={{ marginTop: 32 }}>
            {[80, 100, 70, 90, 65, 85].map((w, i) => (
              <div key={i} className="skel" style={{ ...skel, height: 14, width: `${w}%`, marginBottom: 10 }} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside>
          <div
            className="skel"
            style={{
              ...skel,
              borderRadius: "var(--radius-lg)",
              height: 280,
            }}
          />
        </aside>
      </div>

      <style>{`
        .skel { animation: pulse-skeleton 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
