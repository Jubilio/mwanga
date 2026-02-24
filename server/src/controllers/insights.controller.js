const { db } = require('../config/db');

const getOverview = async (req, res) => {
  const { householdId } = req.user;
  
  // Expenses by Category (Last 30 days)
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const dateStr = last30Days.toISOString().slice(0, 10);

  const categorySpending = db.prepare(`
    SELECT category, SUM(amount) as total 
    FROM transactions 
    WHERE household_id = ? AND date >= ? AND type = 'despesa'
    GROUP BY category
    ORDER BY total DESC
  `).all(householdId, dateStr);

  // Income vs Expenses (Last 6 months)
  const monthlyTrends = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, 
           SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as income,
           SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END) as expenses
    FROM transactions 
    WHERE household_id = ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all(householdId);

  // Savings Projection (Simple logic)
  const avgMonthlySavings = monthlyTrends.reduce((acc, curr) => acc + (curr.income - curr.expenses), 0) / (monthlyTrends.length || 1);

  // Olivia's Personalized Tip
  let tip = "Continue a registar as suas transações para receber conselhos mais precisos.";
  if (categorySpending.length > 0 && categorySpending[0].category === 'Alimentação' && categorySpending[0].total > 5000) {
    tip = "Olivia notou que os gastos com Alimentação estão elevados este mês. Que tal planejar as compras semanais?";
  } else if (avgMonthlySavings < 0) {
    tip = "Alerta da Olivia: As suas despesas estão a superar as receitas. Vamos rever o seu orçamento?";
  } else if (avgMonthlySavings > 2000) {
    tip = "Excelente trabalho! Com a sua poupança média, poderá atingir as suas metas mais cedo.";
  }

  res.json({
    categorySpending,
    monthlyTrends: monthlyTrends.reverse(),
    projection: {
      avgMonthlySavings,
      projectedYearlySavings: avgMonthlySavings * 12
    },
    oliviaTip: tip
  });
};

module.exports = { getOverview };
