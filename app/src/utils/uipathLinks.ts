const DEFAULT_PORTAL_BASE_URL = 'https://cloud.uipath.com';

const cleanBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const getEnvString = (value: unknown, fallback = '') => {
  const stringValue = typeof value === 'string' ? value.trim() : '';
  return stringValue || fallback;
};

export const getUiPathPortalBaseUrl = () => {
  const explicitPortalUrl = getEnvString(import.meta.env.VITE_UIPATH_PORTAL_URL);
  if (explicitPortalUrl) {
    return cleanBaseUrl(explicitPortalUrl);
  }

  const configuredBaseUrl = getEnvString(import.meta.env.VITE_UIPATH_BASE_URL, DEFAULT_PORTAL_BASE_URL);

  try {
    const url = new URL(configuredBaseUrl);
    if (url.hostname.startsWith('api.')) {
      url.hostname = url.hostname.replace(/^api\./, 'cloud.');
    }
    return url.origin;
  } catch {
    return DEFAULT_PORTAL_BASE_URL;
  }
};

const buildPortalUrl = (segments: string[], query?: Record<string, string | undefined>) => {
  const path = segments
    .filter((segment) => segment.trim().length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const url = new URL(path, `${getUiPathPortalBaseUrl()}/`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

export const buildUiPathOrgUrl = () => {
  const orgName = getEnvString(import.meta.env.VITE_UIPATH_ORG_NAME, 'your-organization');
  return buildPortalUrl([orgName]);
};

export const buildMaestroProcessInstanceUrl = ({
  processKey,
  processInstanceKey,
  folderKey,
}: {
  processKey: string;
  processInstanceKey: string;
  folderKey: string;
}) => {
  const orgName = getEnvString(import.meta.env.VITE_UIPATH_ORG_NAME);
  const tenantName = getEnvString(import.meta.env.VITE_UIPATH_TENANT_NAME);

  return buildPortalUrl(
    [orgName, tenantName, 'maestro_', 'processes', processKey, 'instances', processInstanceKey],
    { folderKey }
  );
};
