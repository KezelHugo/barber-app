/**
 * Convierte enlaces compartidos de Google Drive (ej. /file/d/ID/view?usp=sharing)
 * a URLs directas de imagen nativas (https://lh3.googleusercontent.com/d/ID)
 * para que React Native pueda renderizarlas directamente.
 */
export function getDirectImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Detectar enlaces de Google Drive
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    // Buscar patrón /file/d/FILE_ID o id=FILE_ID
    const match = trimmed.match(/\/file\/d\/([^\/\?]+)/) || trimmed.match(/[?&]id=([^&]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return trimmed;
}
