import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { LANGUAGES, useLanguage, type SupportedLang } from '../i18n';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, langInfo, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelect = (code: SupportedLang) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div className="dropdown" ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="lang-switcher-btn"
        aria-label={t('nav.language')}
        aria-expanded={open}
        title={t('nav.language')}
      >
        <Globe size={15} className="lang-switcher-btn__globe" />
        <span className="lang-switcher-btn__badge">{langInfo.code.toUpperCase()}</span>
        {!compact && <span className="lang-switcher-btn__label max-sm:!hidden">{langInfo.nativeName}</span>}
        <ChevronDown
          size={13}
          style={{
            transition: 'transform 180ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.65,
          }}
        />
      </button>

      {open && (
        <div className="dropdown__menu lang-switcher-menu" role="menu">
          <div className="lang-switcher-menu__header">
            <Globe size={13} />
            <span>{t('nav.language')}</span>
          </div>
          {LANGUAGES.map(item => {
            const isSelected = item.code === lang;
            return (
              <button
                key={item.code}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(item.code)}
                className={`dropdown__item lang-switcher-item ${isSelected ? 'active' : ''}`}
              >
                <span className="lang-switcher-item__code">{item.code.toUpperCase()}</span>
                <div className="lang-switcher-item__text">
                  <span className="lang-switcher-item__native">{item.nativeName}</span>
                  <span className="lang-switcher-item__sub">{item.name}</span>
                </div>
                {isSelected && <Check size={15} className="lang-switcher-item__check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
