import { Alert } from 'react-native';

import { t } from '../i18n/i18n';
import {
  deriveSubscriptionFlags,
  formatPurchasesUserMessage,
  isPurchasesCancelError,
  isPurchasesNetworkError,
  restorePurchasesSync,
} from './iap';

export function showPurchaseFailureAlert(error: unknown): void {
  if (error instanceof Error && error.message === 'PRODUCT_NOT_CONFIGURED') {
    Alert.alert(
      t('paywall.purchaseFailedTitle') as string,
      t('paywall.purchaseUnavailableMessage') as string,
    );
    return;
  }
  if (isPurchasesNetworkError(error)) {
    Alert.alert(
      t('paywall.purchaseFailedTitle') as string,
      t('paywall.purchaseNetworkError') as string,
    );
    return;
  }
  const hint = formatPurchasesUserMessage(error);
  Alert.alert(
    t('paywall.purchaseFailedTitle') as string,
    hint ?? (t('paywall.purchaseUnknownError') as string),
  );
}

/** Shared restore-IAP flow: reloads pro flags, alerts success / none / failure. */
export async function restorePurchasesWithAlerts(options: {
  reload: () => Promise<void>;
  /** e.g. paywall closes after tapping OK when entitlements restored */
  onSuccessNavigateBack?: () => void;
}): Promise<void> {
  try {
    const ci = await restorePurchasesSync();
    await options.reload();
    const flags = deriveSubscriptionFlags(ci);
    if (!flags.isPro && !flags.isLifetime) {
      Alert.alert('', t('general.restoreNone') as string, [{ text: t('general.ok') as string }]);
      return;
    }
    Alert.alert('', t('general.restoreSuccess') as string, [
      { text: t('general.ok') as string, onPress: options.onSuccessNavigateBack },
    ]);
  } catch (e) {
    if (isPurchasesCancelError(e)) return;
    showPurchaseFailureAlert(e);
  }
}
