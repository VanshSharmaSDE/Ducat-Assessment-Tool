/**
 * Utility to resolve uploaded image paths (profile pictures, etc.)
 * Ensures images resolve correctly across:
 * - Localhost development (proxied via Vite on port 5173)
 * - VPS production deployment where backend is hosted on api.<domain>
 * - Custom domain deployments and env overrides (VITE_BACKEND_URL / VITE_API_URL)
 */

export function getProfilePictureUrl(path) {
  if (!path || typeof path !== 'string') return '';

  const trimmed = path.trim();
  if (!trimmed) return '';

  // Already an absolute URL, data URI, or blob URL
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Normalize path with leading slash
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // 1. Check explicit environment variables if configured during build/runtime
  const envBackend = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
  if (envBackend && typeof envBackend === 'string' && envBackend.trim()) {
    const base = envBackend.trim().replace(/\/api\/?$/, '').replace(/\/$/, '');
    return `${base}${cleanPath}`;
  }

  // 2. Browser runtime resolution based on window.location
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;

    // Local dev: Vite proxies /uploads and /api directly to localhost:5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return cleanPath;
    }

    // If currently running directly on the api subdomain
    if (hostname.startsWith('api.')) {
      return `${protocol}//${hostname}${cleanPath}`;
    }

    // Production VPS: frontend is on domain.com or www.domain.com, backend is on api.domain.com
    const cleanDomain = hostname.replace(/^www\./, '');
    return `${protocol}//api.${cleanDomain}${cleanPath}`;
  }

  // Fallback default
  return cleanPath;
}

/**
 * Smart image error handler for avatars:
 * 1. Tries fallback to /api/uploads/... if direct api.<domain>/uploads/... had issues
 * 2. If already tried fallback or invalid, hides broken img and shows sibling fallback (if present)
 */
export function handleAvatarError(e, originalPath) {
  const target = e.currentTarget;
  if (!target) return;

  if (!target.dataset.fallbackRetried && originalPath && typeof originalPath === 'string') {
    target.dataset.fallbackRetried = 'true';
    const clean = originalPath.startsWith('/') ? originalPath : `/${originalPath}`;
    // Fallback: try proxy route /api/uploads...
    target.src = `/api${clean}`;
    return;
  }

  // Hide the broken img element
  target.style.display = 'none';

  // If next sibling is an avatar initial placeholder, ensure it is displayed
  if (target.nextElementSibling) {
    target.nextElementSibling.style.display = 'flex';
  }
}
