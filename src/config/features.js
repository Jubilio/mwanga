/**
 * Subscription tiers and the features (routes) each one unlocks.
 *
 * This is the single source of truth for plans. The pricing page
 * (src/pages/Pricing.jsx) lists exactly what is configured here, so any
 * change to a tier must be mirrored in `pricing.plans.*` in both locales.
 *
 * Pricing page → code tier:
 *   Starter      → free
 *   Crescimento  → growth
 *   Património   → pro
 *   (legacy is the internal admin/developer tier and is never sold)
 */

export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    GROWTH: 'growth',
    PRO: 'pro',
    LEGACY: 'legacy'
};

/**
 * Reading the SMS inbox needs READ_SMS, which Google Play only allows after a
 * permissions declaration. Off until that is approved; pasting SMS still works.
 */
export const SMS_INBOX_ENABLED = false;

const FREE_FEATURES = ['jornada', 'transacoes', 'orcamento', 'habitacao', 'metas', 'xitique'];
const GROWTH_FEATURES = [...FREE_FEATURES, 'dividas', 'patrimonio', 'relatorio'];
const PRO_FEATURES = [
    ...GROWTH_FEATURES,
    'credito', 'simuladores', 'insights', 'sms-import', 'time-machine', 'mordomia', 'nexovibe'
];

export const TIER_FEATURES = {
    free: FREE_FEATURES,
    growth: GROWTH_FEATURES,
    pro: PRO_FEATURES,
    legacy: ['*']
};

/** Monthly prices in MZN, per billing cycle. */
export const PLAN_PRICES = {
    growth: { monthly: 399, annual: 320 },
    pro: { monthly: 999, annual: 800 }
};

/** Free trial of the paid plan, offered once an account has been in use for a while. */
export const TRIAL = {
    TIER: SUBSCRIPTION_TIERS.GROWTH,
    DAYS: 14,
    MIN_ACCOUNT_AGE_DAYS: 30,
    WARN_DAYS_BEFORE_END: 3
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Trial state derived from settings and the account creation date.
 * `eligible` means the trial can be offered; `active` means it is running now.
 */
export function getTrialStatus(settings = {}, accountCreatedAt, now = new Date()) {
    const tier = settings.subscription_tier || SUBSCRIPTION_TIERS.FREE;
    const endsAt = settings.trial_ends_at ? new Date(settings.trial_ends_at) : null;
    const hasValidEnd = endsAt && !Number.isNaN(endsAt.getTime());
    const active = tier === SUBSCRIPTION_TIERS.FREE && hasValidEnd && endsAt > now;
    const daysLeft = active ? Math.ceil((endsAt - now) / DAY_MS) : 0;

    const createdAt = accountCreatedAt ? new Date(accountCreatedAt) : null;
    const accountAgeDays = createdAt && !Number.isNaN(createdAt.getTime())
        ? Math.floor((now - createdAt) / DAY_MS)
        : 0;

    return {
        active,
        used: Boolean(settings.trial_ends_at),
        endsAt: hasValidEnd ? endsAt : null,
        daysLeft,
        endingSoon: active && daysLeft <= TRIAL.WARN_DAYS_BEFORE_END,
        eligible: tier === SUBSCRIPTION_TIERS.FREE && !settings.trial_ends_at && accountAgeDays >= TRIAL.MIN_ACCOUNT_AGE_DAYS
    };
}

/** The tier the user effectively has right now, counting an active trial. */
export function getEffectiveTier(settings = {}, now = new Date()) {
    const tier = settings.subscription_tier || SUBSCRIPTION_TIERS.FREE;
    if (tier !== SUBSCRIPTION_TIERS.FREE) return tier;
    return getTrialStatus(settings, null, now).active ? TRIAL.TIER : tier;
}

/**
 * Check if a user tier has access to a feature
 */
export function hasFeatureAccess(tier = 'free', featureName = '') {
    const allowedFeatures = TIER_FEATURES[tier] || TIER_FEATURES.free;
    return allowedFeatures.includes('*') || allowedFeatures.includes(featureName);
}
