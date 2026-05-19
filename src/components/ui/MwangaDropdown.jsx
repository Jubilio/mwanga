/**
 * MwangaDropdown.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dropdown menu premium e acessível para o Mwanga.
 * Usa Radix UI DropdownMenu para comportamento WAI-ARIA robusto.
 *
 * Uso:
 *   <MwangaDropdown
 *     trigger={<button>Opções</button>}
 *     items={[
 *       { label: 'Editar', icon: Edit, onClick: () => {} },
 *       { label: 'Eliminar', icon: Trash, onClick: () => {}, variant: 'danger' },
 *     ]}
 *   />
 */
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

export function MwangaDropdown({ trigger, items = [], align = 'end', sideOffset = 8 }) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          style={{
            zIndex: 9998,
            minWidth: '180px',
            padding: '6px',
            borderRadius: '16px',
            backgroundColor: 'rgba(8, 18, 36, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            animationDuration: '0.2s',
          }}
        >
          {items.map((item, i) => {
            if (item.separator) {
              return (
                <DropdownMenuPrimitive.Separator
                  key={i}
                  style={{
                    height: '1px',
                    margin: '4px 0',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                />
              );
            }

            const Icon = item.icon;
            const isDanger = item.variant === 'danger';

            return (
              <DropdownMenuPrimitive.Item
                key={i}
                onSelect={item.onClick}
                disabled={item.disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  color: isDanger ? '#ff6b6b' : '#cbd5e1',
                  opacity: item.disabled ? 0.5 : 1,
                  outline: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDanger
                    ? 'rgba(255,107,107,0.12)'
                    : 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {Icon && <Icon size={15} />}
                {item.label}
              </DropdownMenuPrimitive.Item>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
