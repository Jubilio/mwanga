import { useFinance } from './useFinance';
import { getEffectiveTier, hasFeatureAccess } from '../config/features';

/**
 * Hook para verificar o acesso a features pagas, contando com o período de teste.
 */
export function useProFeatures() {
    const { state } = useFinance();

    const tier = getEffectiveTier(state.settings);
    const hasFeature = (featureName) => hasFeatureAccess(tier, featureName);

    return {
        isPro: tier === 'pro' || tier === 'legacy',
        subscription_tier: tier,
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
