// Frontend runtime config for ROMIX
// Set this to your backend base URL (no trailing slash)
// Example: window.ROMIX_API_URL = 'https://api.tudominio.com';
// Default to same-origin (empty string) so production works out of the box.
// For local dev, override this in HTML if needed.
window.ROMIX_API_URL = typeof window.ROMIX_API_URL !== 'undefined' ? window.ROMIX_API_URL : '';

