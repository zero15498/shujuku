import { logDebug_ACU, logError_ACU, logWarn_ACU } from '../../../shared/utils';
import {
  getAcuV2PiniaForBridge,
  openAcuV2App,
} from '../../bootstrap/mount';
import { useRootShellStore } from '../../stores/root-shell-store';
import { useRouterStore } from '../../stores/router-store';
import {
  useVisualizerStore,
  type VisualizerOpenSource,
} from '../../stores/visualizer-store';

interface OpenVisualizerSurfaceOptions {
  source?: VisualizerOpenSource;
}

interface AutoCardUpdaterV2Api {
  openVisualizer: () => Promise<boolean>;
  refreshVisualizer: () => Promise<void>;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function formatMs(value: number): string {
  return `${Math.round(value)}ms`;
}

export async function openVisualizerSurface_ACU(
  options: OpenVisualizerSurfaceOptions = {},
): Promise<boolean> {
  const startedAt = nowMs();
  const source = options.source ?? 'external-api';
  try {
    const existingPinia = getAcuV2PiniaForBridge();
    const wasShellOpen = existingPinia
      ? useRootShellStore(existingPinia).isOpen
      : false;
    const previousPageId = existingPinia
      ? useRouterStore(existingPinia).activePageId
      : null;

    const openAppStartedAt = nowMs();
    await openAcuV2App();
    const openAppElapsed = nowMs() - openAppStartedAt;

    const pinia = getAcuV2PiniaForBridge();
    if (!pinia) throw new Error('v2 app was not mounted.');

    const router = useRouterStore(pinia);
    const visualizer = useVisualizerStore(pinia);
    const storeOpenStartedAt = nowMs();
    visualizer.open({
      source,
      wasShellOpen,
      previousPageId: previousPageId ?? router.activePageId,
    });
    const storeOpenElapsed = nowMs() - storeOpenStartedAt;
    const totalElapsed = nowMs() - startedAt;
    const message = `[VisualizerPerf] openSurface source=${source} wasMounted=${!!existingPinia} wasShellOpen=${wasShellOpen} previousPage=${previousPageId ?? router.activePageId ?? 'none'} openApp=${formatMs(openAppElapsed)} storeOpen=${formatMs(storeOpenElapsed)} total=${formatMs(totalElapsed)}`;
    logDebug_ACU(message);
    if (totalElapsed >= 1000) logWarn_ACU(message);
    return true;
  } catch (error) {
    logError_ACU('openVisualizerSurface failed:', error);
    return false;
  }
}

export async function requestVisualizerExternalRefresh_ACU(): Promise<void> {
  const pinia = getAcuV2PiniaForBridge();
  if (!pinia) return;
  useVisualizerStore(pinia).requestExternalRefresh();
}

export function installAutoCardUpdaterV2Api_ACU(): void {
  if (typeof window === 'undefined') return;
  const target = window as any;
  const previous = target.AutoCardUpdaterV2API || {};
  target.AutoCardUpdaterV2API = {
    ...previous,
    openVisualizer: () => openVisualizerSurface_ACU({ source: 'external-api' }),
    refreshVisualizer: requestVisualizerExternalRefresh_ACU,
  } satisfies AutoCardUpdaterV2Api;
}

installAutoCardUpdaterV2Api_ACU();
