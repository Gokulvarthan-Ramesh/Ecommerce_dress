import { GOOGLE_DRIVE_CONFIG } from '../config/googleDrive';

export class GoogleDriveService {
  /**
   * Extract Google Drive file ID from any standard Google Drive share link
   * Examples supported:
   * - https://drive.google.com/file/d/1A2B3C4D5E6F/view?usp=sharing
   * - https://drive.google.com/open?id=1A2B3C4D5E6F
   * - https://drive.google.com/uc?id=1A2B3C4D5E6F
   * - https://lh3.googleusercontent.com/d/1A2B3C4D5E6F
   * - Raw file ID: 1A2B3C4D5E6F
   */
  static extractFileId(urlOrId: string): string | null {
    if (!urlOrId || typeof urlOrId !== 'string') return null;

    const trimmed = urlOrId.trim();

    // Direct match if already just a file ID (typically 25-50 alphanumeric characters)
    if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
      return trimmed;
    }

    // Pattern 1: /file/d/{id}
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      return fileDMatch[1];
    }

    // Pattern 2: ?id={id} or &id={id}
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1]) {
      return idParamMatch[1];
    }

    // Pattern 3: lh3.googleusercontent.com/d/{id}
    const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (lh3Match && lh3Match[1]) {
      return lh3Match[1];
    }

    return null;
  }

  /**
   * Convert any Google Drive share URL into a direct, embeddable CDN image URL
   * Returns https://lh3.googleusercontent.com/d/{fileId}
   * Which renders directly in React Native <Image> and web <img> tags without CORS or redirect issues.
   */
  static formatToDirectImageUrl(urlOrId: string): string {
    const fileId = this.extractFileId(urlOrId);
    if (!fileId) {
      this.validateImageUrl(urlOrId);
      return urlOrId;
    }

    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  /**
   * Convert an array of image URLs, auto-formatting any Google Drive URLs
   */
  static formatImageUrls(urls: string[]): string[] {
    if (!Array.isArray(urls)) return [];
    return urls.map((url) => {
      this.validateImageUrl(url);
      return this.formatToDirectImageUrl(url);
    });
  }

  /**
   * Strict MIME validation / Extension hardening for provided image URLs
   */
  static validateImageUrl(url: string): void {
    if (!url) return;
    
    // If it's a base64 string, check mime type strictly
    if (url.startsWith('data:')) {
      const match = url.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
      if (!match) {
        throw new Error('Invalid image MIME type for Base64. Only PNG, JPEG, JPG, WEBP are allowed.');
      }
      return;
    }

    // Google drive links are allowed (they don't always end with extension)
    if (url.includes('drive.google.com') || url.includes('googleusercontent.com')) {
      return;
    }

    // Cloudinary links
    if (url.includes('res.cloudinary.com')) {
      return;
    }

    // Unsplash
    if (url.includes('images.unsplash.com')) {
      return;
    }

    // For standard URLs, check extension
    const urlLower = url.toLowerCase();
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
    const hasValidExtension = validExtensions.some(ext => {
      try {
        const urlObj = new URL(urlLower);
        return urlObj.pathname.endsWith(ext);
      } catch {
        return urlLower.endsWith(ext);
      }
    });

    if (!hasValidExtension) {
      throw new Error(`Invalid image format or untrusted domain. Only ${validExtensions.join(', ')} extensions are allowed.`);
    }
  }
}
