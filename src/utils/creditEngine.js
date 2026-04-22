
/**
 * Financial Engine for Credit and Loan Calculations
 * Handles compound interest, installments, amortization, and eligibility.
 */
export const CreditEngine = {
  // Compound interest: M = P(1+i)^n
  compound(principal, rateMonthly, months) {
    return principal * Math.pow(1 + rateMonthly, months);
  },
  
  // Installment (Annuity/Price Table): P = (C * i * (1+i)^n) / ((1+i)^n - 1)
  installment(principal, rate, months, isAnnual = false) {
    let i = isAnnual ? (Math.pow(1 + rate, 1/12) - 1) : rate;
    if (i === 0) return principal / months;
    const pow = Math.pow(1 + i, months);
    return (principal * i * pow) / (pow - 1);
  },
  
  // Stamp Duty (Mozambique approximation - 0.5% of capital)
  stampDuty(principal) {
    return principal * 0.005;
  },
  
  // Complete Amortization Table
  amortizationTable(principal, rateMonthly, months) {
    const i = rateMonthly;
    const parc = this.installment(principal, i, months, false);
    let saldo = principal;
    const rows = [];
    for (let current = 1; current <= months; current++) {
      const juros = saldo * i;
      const amort = parc - juros;
      saldo -= amort;
      rows.push({
        n: current,
        parcela: parc,
        juros,
        amortizacao: amort,
        saldo: Math.max(0, saldo),
      });
    }
    return rows;
  },
  
  // Annual Effective Rate (CET) approximation
  cet(amount, rate, months, isAnnual = false) {
    const rateAnnual = isAnnual ? rate : (Math.pow(1 + rate, 12) - 1);
    return rateAnnual * 100;
  },
  
  // Suggest minimum months based on a maximum installment constraint
  suggestMinMonths(amount, rate, maxInstallment, isAnnual = false) {
    if (maxInstallment <= 0) return 60;
    const i = isAnnual ? (Math.pow(1 + rate, 1/12) - 1) : rate;
    if (i <= 0) return Math.ceil(amount / maxInstallment);
    const check = (amount * i) / maxInstallment;
    if (check >= 1) return 120; // Unattainable with this salary
    const n = Math.log(1 - check) / -Math.log(1 + i);
    return Math.ceil(n);
  }
};
