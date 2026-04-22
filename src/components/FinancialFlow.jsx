import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { useTranslation } from 'react-i18next';
import { fmt, calcMonthlyTotals, calcCategoryBreakdown } from '../utils/calculations';
import { normalizeCategory } from '../utils/categories';

export default function FinancialFlow({ transactions, currency, monthKey, rendas, startDay }) {
  const { t } = useTranslation();
  const svgRef = useRef();

  const data = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;

    // Helper para tradução e normalização de categorias
    const getCategoryLabel = (categoryName) => {
      const key = normalizeCategory(categoryName);
      const translationKey = `common.categories.${key}`;
      const translated = t(translationKey);
      
      return translated !== translationKey ? translated : (categoryName || t('common.categories.other'));
    };

    // Usar as funções core para garantir consistência total
    const totals = calcMonthlyTotals(transactions, monthKey, rendas, startDay);
    const catBreakdown = calcCategoryBreakdown(transactions, 'despesa', monthKey, rendas, startDay);
    
    const incomeTotal = totals.totalIncome;
    const expenseTotal = totals.totalExpenses;
    const savings = totals.saldo > 0 ? totals.saldo : 0;

    // Se não há dinheiro a fluir, não desenhamos nada
    if (incomeTotal <= 0 && expenseTotal <= 0) return null;

    // 1. Normalizar as categorias para evitar duplicados (ex: "Alimentação" e "food")
    const consolidatedExpenses = {};
    catBreakdown.forEach(item => {
      if (item.amount > 0) {
        const label = getCategoryLabel(item.category);
        consolidatedExpenses[label] = (consolidatedExpenses[label] || 0) + item.amount;
      }
    });

    // 2. Definir Nós (Nodes)
    const rawNodes = [
      { name: t('dashboard.income'), id: 'income', color: '#10b981' },
      { name: t('dashboard.expenses'), id: 'expenses', color: '#ef4444' },
      { name: t('common.categories.savings'), id: 'savings', color: '#f59e0b' },
    ];

    Object.keys(consolidatedExpenses).forEach(label => {
      rawNodes.push({ 
        name: label, 
        id: `cat_${label}`,
        color: '#64748b'
      });
    });

    // 3. Definir Ligações
    const links = [];
    const activeNodeIds = new Set(['income']);

    if (expenseTotal > 0) {
      links.push({ source: 'income', target: 'expenses', value: Math.min(incomeTotal, expenseTotal) });
      activeNodeIds.add('expenses');
      
      Object.entries(consolidatedExpenses).forEach(([label, val]) => {
        links.push({ source: 'expenses', target: `cat_${label}`, value: val });
        activeNodeIds.add(`cat_${label}`);
      });
    }

    if (savings > 0) {
      links.push({ source: 'income', target: 'savings', value: savings });
      activeNodeIds.add('savings');
    }

    // 4. Filtrar e Mapear
    const nodes = rawNodes.filter(n => activeNodeIds.has(n.id));
    const nodeMap = {};
    nodes.forEach((n, i) => nodeMap[n.id] = i);

    const finalLinks = links.map(l => ({
      source: nodeMap[l.source],
      target: nodeMap[l.target],
      value: l.value
    })).filter(l => l.source !== undefined && l.target !== undefined);

    return { nodes, links: finalLinks };
  }, [transactions, monthKey, rendas, startDay, t]);

  useEffect(() => {
    if (!data || !svgRef.current || data.nodes.length === 0) return;

    const width = 600;
    const height = 350;
    const margin = { top: 10, right: 100, bottom: 10, left: 10 };

    // Limpar SVG anterior
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .style('font-family', 'inherit');

    const sankeyGenerator = sankey()
      .nodeWidth(14)
      .nodePadding(24)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map(d => Object.assign({}, d)),
      links: data.links.map(d => Object.assign({}, d))
    });

    // Gradientes para os links
    const defs = svg.append('defs');
    links.forEach((link, i) => {
      const gradientID = `gradient-${i}`;
      const gradient = defs.append('linearGradient')
        .attr('id', gradientID)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x1)
        .attr('x2', link.target.x0);

      gradient.append('stop').attr('offset', '0%').attr('stop-color', link.source.color);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', link.target.color);
      link.gradientID = gradientID;
    });

    // Desenhar ligações (Links)
    svg.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', d => `url(#${d.gradientID})`)
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.2)
      .on('mouseover', function() { d3.select(this).attr('stroke-opacity', 0.5); })
      .on('mouseout', function() { d3.select(this).attr('stroke-opacity', 0.2); });

    // Desenhar nós (Nodes)
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g');

    node.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => d.color || '#64748b')
      .attr('rx', 4);

    // Texto dos nós
    node.append('text')
      .attr('x', d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '-0.2em')
      .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', 'currentColor')
      .text(d => d.name);

    node.append('text')
      .attr('x', d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '1em')
      .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
      .attr('font-size', '10px')
      .attr('font-weight', '400')
      .attr('fill', 'var(--color-muted)')
      .text(d => fmt(d.value, currency));

  }, [data, currency]);

  if (!data) return null;

  return (
    <div className="glass-card p-6 overflow-visible">
      <div className="mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{t('reports.chart.sankey_title') || 'Fluxo de Caixa Sankey'}</h3>
        <p className="text-xs font-bold text-midnight dark:text-white mt-1">{t('reports.chart.sankey_subtitle') || 'Sincronizado com os teus relatórios mensais'}</p>
      </div>
      <div className="dark:text-white" style={{ minHeight: '350px' }}>
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}
