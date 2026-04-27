import React, { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { UiPath, UiPathError } from '@uipath/uipath-typescript';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript';
import { getMissingJobStartScopeMessage, logUiPathTokenDiagnostics } from '../utils/uipathTokenDiagnostics';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdk: UiPath;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof UiPathError || err instanceof Error) {
    return err.message;
  }

  return fallback;
};

const hasStoredOAuthToken = (clientId?: string) => {
  return !!clientId && sessionStorage.getItem(`uipath_sdk_user_token-${clientId}`) !== null;
};

const clearStoredOAuthSession = (clientId?: string) => {
  if (clientId) {
    sessionStorage.removeItem(`uipath_sdk_user_token-${clientId}`);
  }

  sessionStorage.removeItem('uipath_sdk_oauth_context');
  sessionStorage.removeItem('uipath_sdk_code_verifier');
};

export const AuthProvider: React.FC<{ children: ReactNode; config: UiPathSDKConfig }> = ({ children, config }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk, setSdk] = useState<UiPath>(() => new UiPath(config));

  const validateAuthenticatedSdk = (sdkInstance: UiPath) => {
    if (!sdkInstance.isAuthenticated()) return;

    const diagnostics = logUiPathTokenDiagnostics(sdkInstance.getToken(), '[auth] Loaded app token diagnostics');
    const missingScopeMessage = getMissingJobStartScopeMessage(diagnostics);

    if (missingScopeMessage) {
      clearStoredOAuthSession(config.clientId);
      throw new Error(`${missingScopeMessage} Click Login with UiPath to request a fresh token.`);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (sdk.isInOAuthCallback() || hasStoredOAuthToken(config.clientId)) {
          await sdk.initialize();
        }

        validateAuthenticatedSdk(sdk);
        setIsAuthenticated(sdk.isAuthenticated());
      } catch (err) {
        console.error('Authentication initialization failed:', err);
        setError(getAuthErrorMessage(err, 'Authentication failed'));
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, [sdk]);

  const login = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextSdk = new UiPath(config);
      setSdk(nextSdk);
      await nextSdk.initialize();
      validateAuthenticatedSdk(nextSdk);
      setIsAuthenticated(nextSdk.isAuthenticated());
    } catch (err) {
      console.error('Login failed:', err);
      setError(getAuthErrorMessage(err, 'Login failed'));
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredOAuthSession(config.clientId);

    setIsAuthenticated(false);
    setError(null);
    setSdk(new UiPath(config));
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        sdk,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
