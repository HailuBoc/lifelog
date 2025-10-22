export default function SearchPage() {
  return (
    <section>
      <h1>Smart Search</h1>
      <p>Find entries, emotions, or topics using AI-powered search.</p>
      <input
        type="text"
        placeholder="Search your memories..."
        style={{ width: "100%", padding: "1em" }}
      />
      <div style={{ marginTop: "1em" }}>
        <p>🔎 Results will appear here...</p>
      </div>
    </section>
  );
}
