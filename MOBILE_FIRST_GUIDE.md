<!-- 
  📱 MOBILE-FIRST COMPONENTS GUIDE
  
  Este arquivo documenta padrões de componentes mobile-friendly
  para o projeto Mwanga após as melhorias de responsividade.
-->

# 📱 Guia de Componentes Mobile-First

## 1️⃣ Card Component
```jsx
<div className="glass-card p-4 md:p-6 lg:p-8 rounded-2xl">
  {/* Padding responsivo automático */}
  {/* Mobile: p-4 (1rem) */}
  {/* Tablet: p-6 (1.5rem) */}
  {/* Desktop: p-8 (2rem) */}
</div>
```

**CSS base em `src/index.css`:**
```css
.glass-card {
  padding: 1rem;       /* Mobile default */
  border-radius: 16px; /* Telas pequenas preferem cantos menores */
}

@media (min-width: 768px) {
  .glass-card {
    padding: 1.5rem;
    border-radius: 20px;
  }
}

@media (min-width: 1200px) {
  .glass-card {
    padding: 2rem;
    border-radius: 24px;
  }
}
```

---

## 2️⃣ Grid Layout Component

### ✅ Responsivo Automático com Tailwind
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
  {/* 1 coluna em mobile, 2 em tablet, 3 em desktop */}
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### ⚠️ Evite
```jsx
// ❌ NÃO faça isso - will break on mobile
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
```

---

## 3️⃣ Bottom Navigation (Mobile Only)

```jsx
// Em components/Layout.jsx - já implementado
<nav className="hide-desktop fixed bottom-0 left-0 right-0 flex justify-around p-2 pb-safe-area">
  {/* Esta nav só aparece em mobile (<768px) */}
  {navItems.map(item => (
    <NavButton key={item.to} {...item} />
  ))}
</nav>

// Em CSS
@media (max-width: 767px) {
  main {
    padding-bottom: 6rem; /* Space for bottom nav */
  }
}
```

---

## 4️⃣ Tabelas Responsivas

### ✅ Correto - Scroll Horizontal em Mobile
```jsx
<div className="table-container overflow-x-auto">
  <table className="w-full text-sm md:text-base">
    <thead>
      <tr>
        <th className="px-2 py-1 md:px-4 md:py-2">Coluna 1</th>
      </tr>
    </thead>
  </table>
</div>

// CSS
.table-container {
  -webkit-overflow-scrolling: touch; /* Smooth on iOS */
  border-radius: 12px;
  border: 1px solid var(--color-border);
}
```

### ❌ Evite
```jsx
// Stack vertical em mobile em vez de scroll
<table className="w-full">
  {/* Vai quebrar layout */}
</table>
```

---

## 5️⃣ Formulários Mobile-Friendly

```jsx
<form className="space-y-3 md:space-y-4">
  {/* Input deve ter 16px em mobile para evitar zoom iOS */}
  <input 
    type="email"
    className="form-input w-full text-base md:text-sm"
    placeholder="email@example.com"
  />
  
  {/* Botões full-width em mobile */}
  <button className="w-full md:w-auto btn btn-primary">
    Enviar
  </button>
</form>

// CSS
.form-input {
  font-size: 16px !important; /* Prevent iOS zoom */
  padding: 0.8rem;            /* Larger touch target */
  width: 100%;
}}

@media (min-width: 768px) {
  .form-input {
    font-size: 14px;
    padding: 0.7rem;
  }
}
```

---

## 6️⃣ Tipografia Responsiva

```jsx
// Usando clamp() para fluid typography
<h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.6rem)' }}>
  {/* 1.5rem em mobile, até 2.6rem em desktop */}
</h1>

<h2 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.9rem)' }} />
<h3 style={{ fontSize: 'clamp(1.05rem, 3vw, 1.45rem)' }} />
```

---

## 7️⃣ Imagens Responsivas

```jsx
// ✅ Correto
<img 
  src="/image.jpg"
  srcSet="/image-mobile.jpg 375w, /image-tablet.jpg 768w, /image-desktop.jpg 1200w"
  sizes="(max-width: 375px) 100vw, (max-width: 768px) 90vw, 80vw"
  alt="Descrição"
  className="w-full h-auto rounded-lg"
/>

// Ou com CSS
<img 
  className="w-full object-cover rounded-lg"
  style={{
    maxHeight: '250px'  /* Mobile */
  }}
/>

@media (min-width: 768px) {
  img {
    max-height: 350px;
  }
}
```

---

## 8️⃣ Sidebar Responsivo

```jsx
// Exemplo: Sidebar já implementado em src/components/layout/Sidebar.jsx

// Mobile: Fixed position, animates left: -280px → 0
// Tablet+: Static, sempre visível

// CSS:
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -280px;
    transition: left 0.28s ease;
    z-index: 90;
  }
  
  .sidebar.open {
    left: 0;
  }
  
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(2px);
    z-index: 89;
  }
}
```

---

## 9️⃣ Touch-Friendly Buttons

```jsx
// ✅ Correto - 44px minimum touch target
<button className="w-12 h-12 flex items-center justify-center rounded-lg">
  {/* 48px minimum ideal para mobile */}
</button>

// ✅ Remover highlight ao tap
<button style={{ WebkitTapHighlightColor: 'transparent' }}>
  Toque aqui
</button>

// CSS:
* {
  -webkit-tap-highlight-color: transparent;
}

button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1.25rem; /* Ensure 44px height */
}
```

---

## 🔟 Charts Responsivos (Recharts)

```jsx
// ✅ Correto
<ResponsiveContainer width="100%" height={250}>
  <AreaChart data={data}>
    {/* Charts automáticamente responsivos */}
  </AreaChart>
</ResponsiveContainer>

// CSS:
@media (max-width: 767px) {
  .recharts-responsive-container {
    height: 250px !important;
  }
}

@media (min-width: 768px) {
  .recharts-responsive-container {
    height: 350px !important;
  }
}
```

---

## Checklist de Responsividade

Quando criar um novo componente, validar:

- [ ] **Mobile (< 375px)**
  - [ ] Texto legível (16px min)
  - [ ] Botões tocáveis (44x44px)
  - [ ] Sem horizontal scroll (exceto tabelas)
  - [ ] Padding adequado (0.75-1rem)

- [ ] **Tablet (375-768px)**
  - [ ] 2-coluna grid funciona
  - [ ] Layout não quebra
  - [ ] Spacing: 1-1.5rem

- [ ] **Desktop (768px+)**
  - [ ] Sidebar visível
  - [ ] Bottom nav oculta
  - [ ] Grid 3-4 colunas
  - [ ] Max-width respeitada

- [ ] **Orientação**
  - [ ] Landscape não quebra
  - [ ] Portrait funciona
  - [ ] Safe areas (notch) respeitadas

- [ ] **Acessibilidade**
  - [ ] Focus states visíveis
  - [ ] ARIA labels presentes
  - [ ] Cores têm constraste
  - [ ] Touch targets >= 44px

---

## Recursos Úteis

- 📖 [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- 🎨 [Tailwind Responsive](https://tailwindcss.com/docs/responsive-design)
- 📱 [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- 🤖 [Android Material Design](https://material.io/design/)
- 🔍 [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

---

**Última atualização: 18 de Março de 2026**  
**Versão: 0.1.0 Mobile-First**
