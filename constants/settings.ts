/**
 * Identifiers for grouped settings UI sections (e.g. Tips & Help).
 * Use with i18n keys such as settings.tipsTitle.
 */
export const SETTINGS_UI_SECTION = {
  tipsAndHelp: 'tips_and_help',
} as const;

export type SettingsUiSectionId =
  (typeof SETTINGS_UI_SECTION)[keyof typeof SETTINGS_UI_SECTION];
