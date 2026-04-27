import type { UiPath } from '@uipath/uipath-typescript';

type StartJobPayload = {
  processKey: string;
  strategy?: string;
  jobsCount?: number;
  runtimeType?: string;
  jobPriority?: string;
  inputArguments?: string;
  requiresUserInteraction?: boolean;
  runAsMe?: boolean;
};

type UiPathErrorResponse = {
  message?: string;
  error?: string;
  title?: string;
  details?: string;
};

const getConfigValue = (value: unknown, fallback = '') => String(value || fallback).replace(/\/+$/, '');

const getOrchestratorUrl = () => {
  const baseUrl = getConfigValue(import.meta.env.VITE_UIPATH_BASE_URL, 'https://api.uipath.com');
  const orgName = String(import.meta.env.VITE_UIPATH_ORG_NAME || '').trim();
  const tenantName = String(import.meta.env.VITE_UIPATH_TENANT_NAME || '').trim();

  return `${baseUrl}/${orgName}/${tenantName}/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs`;
};

const parseErrorResponse = async (response: Response) => {
  const text = await response.text().catch(() => '');
  if (!text) return response.statusText;

  try {
    const parsed = JSON.parse(text) as UiPathErrorResponse;
    return parsed.message || parsed.error || parsed.title || parsed.details || text;
  } catch {
    return text;
  }
};

export const startOrchestratorJob = async (
  sdk: UiPath,
  payload: StartJobPayload,
  folderId: number
) => {
  const token = sdk.getToken();
  if (!token) {
    throw new Error('No UiPath access token available. Please sign in again.');
  }

  const startInfo = {
    ReleaseKey: payload.processKey,
    Strategy: payload.strategy,
    JobsCount: payload.jobsCount,
    RuntimeType: payload.runtimeType,
    JobPriority: payload.jobPriority,
    InputArguments: payload.inputArguments,
    RequiresUserInteraction: payload.requiresUserInteraction,
    ...(payload.runAsMe === true ? { RunAsMe: true } : {}),
  };

  const endpoint = getOrchestratorUrl();
  console.log('StartJobs Endpoint:', endpoint);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-UIPATH-OrganizationUnitId': String(folderId),
    },
    body: JSON.stringify({ startInfo }),
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    const error = new Error(message || response.statusText) as Error & {
      type?: string;
      status?: number;
      statusCode?: number;
      endpoint?: string;
    };
    error.type = response.status === 403 ? 'AuthorizationError' : 'OrchestratorError';
    error.status = response.status;
    error.statusCode = response.status;
    error.endpoint = endpoint;
    throw error;
  }

  if (response.status === 204) {
    return [];
  }

  const data = await response.json();
  return data?.value ?? data;
};
