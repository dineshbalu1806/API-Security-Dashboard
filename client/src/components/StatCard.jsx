export default function StatCard({ label, value, detail, tone = "neutral" }) {
  return <div className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}