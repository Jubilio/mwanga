/**
 * MwangaTooltip.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tooltip global premium para o Mwanga.
 * Usa Radix UI Tooltip para comportamento acessível (WAI-ARIA) + 
 * estilos personalizados fintech.
 *
 * Uso:
 *   <MwangaTooltip content="Ver detalhes do saldo">
 *     <button>Saldo</button>
 *   </MwangaTooltip>
 */
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export function MwangaTooltipProvider({ children }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={100}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function MwangaTooltip({ children, content, side = 'top', align = 'center' }) {
  if (!content) return children;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          style={{
            zIndex: 9999,
            padding: '6px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 500,
            lineHeight: '1.4',
            maxWidth: '220px',
            textAlign: 'center',
            backgroundColor: 'rgba(10, 20, 40, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animationDuration: '0.2s',
          }}
        >
          {content}
          <TooltipPrimitive.Arrow
            style={{
              fill: 'rgba(10, 20, 40, 0.92)',
            }}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
