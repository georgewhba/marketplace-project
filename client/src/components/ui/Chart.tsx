

interface ChartProps {
  data: { label: string; value: number }[];
  maxValue?: number;
  height?: number;
  formatValue?: (value: number) => string;
}

export function BarChart({ data, maxValue, height = 200, formatValue }: ChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="bar-chart" style={{ height: `${height}px`, display: 'flex', alignItems: 'flex-end', gap: '8px', overflowX: 'auto', paddingBottom: 'var(--space-6)' }}>
      {data.map((item, index) => {
        const percentage = (item.value / max) * 100;
        return (
          <div key={index} className="bar-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: '40px' }}>
            <div className="bar-value" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px', textAlign: 'center' }}>
              {formatValue ? formatValue(item.value) : item.value}
            </div>
            <div 
              className="bar" 
              style={{ 
                width: '100%', 
                height: `${Math.max(percentage, 1)}%`, 
                backgroundColor: 'var(--brand-500)', 
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                transition: 'height var(--transition-base)' 
              }}
              title={`${item.label}: ${formatValue ? formatValue(item.value) : item.value}`}
            />
            <div className="bar-label" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
}

export function ProgressBar({ value, max, label, color = 'var(--brand-500)' }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div className="progress-bar-container" style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{value} / {max}</span>
        </div>
      )}
      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${percentage}%`, 
            backgroundColor: color, 
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--transition-base)'
          }}
        />
      </div>
    </div>
  );
}
