import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Pilih file GPX dari penyimpanan ponsel dan kembalikan isinya. */
export async function pickGpx(): Promise<{ name: string; text: string } | null> {
  const res = await File.pickFileAsync({ mimeTypes: ['application/gpx+xml', 'application/xml', 'text/xml', 'application/octet-stream', '*/*'] });
  if (res.canceled || !res.result) return null;
  const file = res.result;
  return { name: file.name, text: await file.text() };
}

/** Simpan teks ke cache lalu buka menu Share Android (misalnya ke aplikasi COROS). */
export async function shareText(fileName: string, text: string, mimeType: string, dialogTitle: string) {
  const safe = fileName.replace(/[^\w.-]+/g, '_');
  const file = new File(Paths.cache, safe);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Fitur berbagi tidak tersedia di perangkat ini.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}
