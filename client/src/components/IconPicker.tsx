import { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';

const CATEGORY_ICONS = [
  'Shirt', 'BookOpen', 'Home', 'Laptop', 'Smartphone', 'Headphones', 'Watch', 
  'Gem', 'Baby', 'Dumbbell', 'Utensils', 'Car', 'Gamepad2', 'Palette', 'Gift', 
  'ShoppingBag', 'Package', 'Tag', 'Monitor', 'Speaker', 'Camera', 'Music', 'Video',
  'Coffee', 'Pizza', 'Apple', 'Sofa', 'Bed', 'Tool', 'Wrench', 'Scissors'
];

export function IconPicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Use a default icon if the value is an emoji or not in the list
  const CurrentIcon = (Icons as any)[value] || Icons.Tag;

  const filteredIcons = CATEGORY_ICONS.filter(name => name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={containerRef} className="icon-picker" style={{ position: 'relative' }}>
      <button 
        type="button"
        className="form-input flex items-center gap-2" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', textAlign: 'right', display: 'flex', width: '100%' }}
      >
        <CurrentIcon size={18} className="text-muted" />
        <span style={{ flex: 1, textAlign: 'right' }}>{value || 'اختر أيقونة...'}</span>
        <Icons.ChevronDown size={16} className="text-muted" />
      </button>

      {isOpen && (
        <div 
          className="card" 
          style={{ 
            position: 'absolute', 
            top: '100%', 
            right: 0, 
            width: '100%', 
            minWidth: '280px',
            marginTop: '4px', 
            zIndex: 50,
            padding: 'var(--space-3)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <input 
            type="text" 
            className="form-input mb-3" 
            placeholder="ابحث عن أيقونة..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: 'var(--space-2)' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 'var(--space-2)', maxHeight: '200px', overflowY: 'auto' }}>
            {filteredIcons.map(iconName => {
              const IconComp = (Icons as any)[iconName];
              if (!IconComp) return null;
              
              const isSelected = value === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    onChange(iconName);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  style={{
                    padding: 'var(--space-2)',
                    background: isSelected ? 'var(--brand-50)' : 'transparent',
                    border: isSelected ? '1px solid var(--brand-300)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: isSelected ? 'var(--brand-600)' : 'var(--text-secondary)'
                  }}
                  title={iconName}
                >
                  <IconComp size={20} />
                </button>
              )
            })}
            {filteredIcons.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
