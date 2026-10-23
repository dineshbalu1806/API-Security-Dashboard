export default function ScoreGauge({ score = 0, label = "Security score" }) {
  const radius = 43; const circumference = 2 * Math.PI * radius; const offset = circumference - (score / 100) * circumference;
  return <div className="score-gauge"><svg viewBox="0 0 110 110"><circle className="gauge-track" cx="55" cy="55" r={radius} /><circle className="gauge-value" cx="55" cy="55" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} /></svg><div className="gauge-label"><strong>{score}</strong><span>/ 100</span></div><small>{label}</small></div>;
}