import { ACCOUNT_ITEMS, ADMIN_ITEM, MORE_ITEMS } from '../config/navigation';
import { useFinance } from '../hooks/useFinance';
import { HubHeader, HubSection, HubTiles } from './hubs/HubGrid';

export default function Mais() {
  const { state } = useFinance();
  const account = state.user?.role === 'admin' ? [...ACCOUNT_ITEMS, ADMIN_ITEM] : ACCOUNT_ITEMS;

  return (
    <div className="animate-fade-in pb-24">
      <HubHeader title="nav.more_title" subtitle="nav.more_subtitle" />
      <HubSection title="nav.section_more">
        <HubTiles items={MORE_ITEMS} />
      </HubSection>
      <HubSection title="nav.section_account">
        <HubTiles items={account} />
      </HubSection>
    </div>
  );
}
