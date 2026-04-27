/** Skeleton shown by Next.js while the recipes list page fetches data. */
export default function RecipesLoading() {
  const skel: React.CSSProperties = {
    backgroundColor: "var(--bg-muted)",
    borderRadius: "var(--radius-md)",
  };

  return (
    <div
      style={{
        maxWidth: "var(--container-app, 1280px)",
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div className="skel" style={{ ...skel, width: 180, height: 40 }} />
        <div className="skel" style={{ ...skel, width: 128, height: 40 }} />
      </div>

      {/* Search bar */}
      <div className="skel" style={{ ...skel, width: "100%", height: 44, marginBottom: 16 }} />

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
        {[80, 100, 64, 90, 72, 88].map((w, i) => (
          <div
            key={i}
            className="skel"
            style={{ ...skel, width: w, height: 32, borderRadius: "var(--radius-full)" }}
          />
        ))}
      </div>

      {/* Card grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 24,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div
              className="skel"
              style={{ ...skel, aspectRatio: "16/9", borderRadius: 0 }}
            />
            <div style={{ padding: "16px" }}>
              <div className="skel" style={{ ...skel, height: 22, width: "70%", marginBottom: 8 }} />
              <div className="skel" style={{ ...skel, height: 14, width: "90%", marginBottom: 4 }} />
              <div className="skel" style={{ ...skel, height: 14, width: "60%" }} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .skel { animation: pulse-skeleton 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
