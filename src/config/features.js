/**
 * Developer Mode Configuration
 * 
 * This file enables all Pro features for development/testing purposes.
 * In production, set subscription_tier based on payment status.
 */

export const DEVELOPER_MODE = true; // Set to false in production

export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    GROWTH: 'growth',
    PRO: 'pro',
    LEGACY: 'legacy' // Admin/developer tier
};

export const TIER_FEATURES = {
    free: [
        'transacoes',
        'orcamento',
        'habitacao',
        'metas'
    ],
    growth: [
        'transacoes',
        'orcamento',
        'habitacao',
        'metas',
        'dividas',
        'patrimonio',
        'relatorio'
    ],
    pro: [
        'transacoes',
        'orcamento',
        'habitacao',
        'metas',
        'dividas',
        'patrimonio',
        'relatorio',
        'xitique',
        'credito',
        'simuladores',
        'insights',
        'nexovibe',
        'sms-import'
    ],
    legacy: ['*'] // All features
};

/**
 * Get default subscription tier for new users
 * In development with DEVELOPER_MODE=true, new users get 'pro'
 * In production, new users should get 'free'
 */
export function getDefaultTier() {
    return DEVELOPER_MODE ? SUBSCRIPTION_TIERS.PRO : SUBSCRIPTION_TIERS.FREE;
}

/**
 * Check if a user tier has access to a feature
 */
export function hasFeatureAccess(tier = 'free', featureName = '') {
    const allowedFeatures = TIER_FEATURES[tier] || TIER_FEATURES.free;
    return allowedFeatures.includes('*') || allowedFeatures.includes(featureName);
}
