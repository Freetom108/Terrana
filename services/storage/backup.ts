import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { t } from '../i18n/i18n';

const BACKUP_VERSION = 1;
const BACKUP_MARKER = '_terranaBackup';

/** AsyncStorage keys included in a backup (user data + app preferences; no subscription state). */
const BACKUP_KEYS = [
  'terrana_products',
  'terrana_blends',
  'terrana_theme',
  'terrana_language',
  'terrana_importCount',
  'terrana_onboarded',
] as const;

interface TerranBackupFile {
  [key: string]: unknown;
  version: number;
  createdAt: string;
  data: Record<string, string | null>;
}

function isTerraBackup(obj: unknown): obj is TerranBackupFile {
  if (typeof obj !== 'object' || obj === null) return false;
  const b = obj as Record<string, unknown>;
  return b[BACKUP_MARKER] === true && typeof b['version'] === 'number' && 'data' in b;
}

function buildDateStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Creates a JSON backup of all user data and opens the native share sheet. */
export async function createBackup(): Promise<void> {
  const pairs = await AsyncStorage.multiGet([...BACKUP_KEYS]);
  const data: Record<string, string | null> = {};
  for (const [key, value] of pairs) {
    data[key] = value;
  }

  const backup: Record<string, unknown> = {
    [BACKUP_MARKER]: true,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data,
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `terrana-backup-${buildDateStamp()}.json`;

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(json);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error(t('backup.sharingUnavailable') as string);
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: filename,
  });
}

/**
 * Opens the document picker, validates the selected file as a Terrana backup,
 * prompts the user for confirmation, then restores all data to AsyncStorage.
 * Returns true if the restore was completed, false if cancelled.
 */
export async function restoreBackup(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return false;

  const uri = result.assets[0]?.uri;
  if (!uri) return false;

  const pickedFile = new File(uri);
  const raw = await pickedFile.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(t('backup.invalidFile') as string);
  }

  if (!isTerraBackup(parsed)) {
    throw new Error(t('backup.invalidFile') as string);
  }

  const backupData = parsed.data;

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      t('backup.restoreTitle') as string,
      t('backup.restoreWarning') as string,
      [
        {
          text: t('general.cancel') as string,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: t('backup.restoreConfirm') as string,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const pairs: [string, string][] = [];
                for (const [key, value] of Object.entries(backupData)) {
                  if (typeof value === 'string') {
                    pairs.push([key, value]);
                  }
                }
                if (pairs.length > 0) {
                  await AsyncStorage.multiSet(pairs);
                }
                resolve(true);
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                Alert.alert(
                  t('backup.restoreFailedTitle') as string,
                  t('backup.restoreFailedBody', { message: msg }) as string,
                );
                resolve(false);
              }
            })();
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
