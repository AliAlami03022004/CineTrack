export default function SectionCard({ title, children, action }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}
