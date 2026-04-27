type JwtPayload = {
  iss?: string;
  aud?: string | string[];
  client_id?: string;
  azp?: string;
  scope?: string | string[];
  scp?: string;
  exp?: number;
};

export type UiPathTokenDiagnostics = {
  issuer?: string;
  audience?: string | string[];
  clientId?: string;
  expiresAt?: string;
  scopes: string[];
  hasJobStartScope: boolean;
};

const decodeBase64UrlJson = (value: string): JwtPayload | null => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

const normalizeScopes = (payload: JwtPayload) => {
  const rawScope = payload.scope ?? payload.scp;
  const scopes = Array.isArray(rawScope) ? rawScope : String(rawScope ?? '').split(/\s+/);
  return scopes.map(scope => scope.trim()).filter(Boolean);
};

export const getUiPathTokenDiagnostics = (token?: string): UiPathTokenDiagnostics | null => {
  if (!token) return null;

  const [, payloadPart] = token.split('.');
  if (!payloadPart) return null;

  const payload = decodeBase64UrlJson(payloadPart);
  if (!payload) return null;

  const scopes = normalizeScopes(payload);
  const scopeSet = new Set(scopes);

  return {
    issuer: payload.iss,
    audience: payload.aud,
    clientId: payload.client_id ?? payload.azp,
    expiresAt: typeof payload.exp === 'number' ? new Date(payload.exp * 1000).toISOString() : undefined,
    scopes,
    hasJobStartScope: scopeSet.has('OR.Jobs') || scopeSet.has('OR.Jobs.Write'),
  };
};

export const getMissingJobStartScopeMessage = (diagnostics: UiPathTokenDiagnostics | null) => {
  if (!diagnostics || diagnostics.scopes.length === 0 || diagnostics.hasJobStartScope) {
    return null;
  }

  return 'The current UiPath browser token is missing OR.Jobs or OR.Jobs.Write. Update the External Application scopes if needed, then sign in again so the browser receives a fresh token.';
};

export const logUiPathTokenDiagnostics = (
  token?: string,
  label = '[auth] App token diagnostics'
) => {
  const diagnostics = getUiPathTokenDiagnostics(token);

  if (!diagnostics) {
    console.warn(`${label}: token payload could not be decoded`);
    return null;
  }

  console.group(label);
  console.log('Issuer:', diagnostics.issuer);
  console.log('Audience:', diagnostics.audience);
  console.log('Client ID:', diagnostics.clientId);
  console.log('Expires At:', diagnostics.expiresAt);
  console.log('Scopes:', diagnostics.scopes);
  console.log('Can start Orchestrator jobs:', diagnostics.hasJobStartScope);
  console.groupEnd();

  return diagnostics;
};
