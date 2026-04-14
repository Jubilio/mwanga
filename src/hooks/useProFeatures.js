import { useFinance } from './useFinance';

/**
 * Hook para verificar se o utilizador tem acesso a features Pro
 * Por padrão em desenvolvimento, todos têm acesso
 */
export function useProFeatures() {
    const { state } = useFinance();

    const isPro = state.settings?.subscription_tier === 'pro' || state.settings?.subscription_tier === 'legacy';

    const hasFeature = (featureName) => {
        // Mapeamento de features por tier
        const features = {
            free: ['transacoes', 'orcamento', 'habitacao', 'metas'],
            growth: ['transacoes', 'orcamento', 'habitacao', 'metas', 'dividas', 'patrimonio', 'relatorio'],
            pro: ['transacoes', 'orcamento', 'habitacao', 'metas', 'dividas', 'patrimonio', 'relatorio',
                'xitique', 'credito', 'simuladores', 'insights', 'nexovibe', 'sms-import'],
            legacy: ['*'] // Legacy/admin tier has all features
        };

        const tier = state.settings?.subscription_tier || 'free';
        const allowedFeatures = features[tier] || features.free;

        return allowedFeatures.includes('*') || allowedFeatures.includes(featureName);
    };

    return {
        isPro,
        subscription_tier: state.settings?.subscription_tier || 'free',
        hasFeature,
        // Specific feature checks
        canUseXitique: hasFeature('xitique'),
        canUseCredit: hasFeature('credito'),
        canUseSimulators: hasFeature('simuladores'),
        canViewInsights: hasFeature('insights'),
        canUseSmsImport: hasFeature('sms-import'),
        canViewPatrimony: hasFeature('patrimonio'),
        canViewReports: hasFeature('relatorio')
    };
}
