export default function JournalEntryView({ params }) {
  return (
    <section>
      <h1>Journal Entry ID: {params.id}</h1>
      <p>
        This is where the full journal entry will appear with AI summary and
        mood insights.
      </p>
    </section>
  );
}
