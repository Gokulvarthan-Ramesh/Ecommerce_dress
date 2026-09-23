export const GOOGLE_DRIVE_BASE_URL = 'https://drive.google.com/uc?export=view&id=';

export const getDriveImageUrl = (id: string) => `${GOOGLE_DRIVE_BASE_URL}${id}`;
