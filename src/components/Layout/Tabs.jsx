export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={'tab-btn' + (active === t.id ? ' active' : '')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
