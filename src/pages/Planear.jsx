import { PLAN_ITEMS } from '../config/navigation';
import { HubHeader, HubTiles } from './hubs/HubGrid';

export default function Planear() {
  return (
    <div className="animate-fade-in pb-24">
      <HubHeader title="nav.plan_title" subtitle="nav.plan_subtitle" />
      <HubTiles items={PLAN_ITEMS} />
    </div>
  );
}
