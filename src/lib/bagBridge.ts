import { registerPlugin } from '@capacitor/core';

interface BagBridgePlugin {
  save(options: { json: string }): Promise<void>;
}

const BagBridge = registerPlugin<BagBridgePlugin>('BagBridge');

/**
 * Write bag data to the shared App Group UserDefaults so the iOS widget can read it.
 * No-ops silently on web/Android where the native plugin isn't present.
 */
export async function syncBagToWidget(json: string): Promise<void> {
  try {
    await BagBridge.save({ json });
  } catch {
    // Not on iOS or App Group not configured yet — ignore
  }
}
