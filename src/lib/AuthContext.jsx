import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { buildTenant, configureAthosCompanyId } from '@/lib/tenantScope';

const AuthContext = createContext();

// systemOwner の会社セレクタ選択値をリロード跨ぎで保持する localStorage キー。
// 非 systemOwner では buildTenant が無視するため、保持していても越境にはならない（UX のみ）。
const SELECTED_COMPANY_KEY = 'tenant:selectedCompanyId';

const readStoredSelectedCompanyId = () => {
  try {
    return window.localStorage.getItem(SELECTED_COMPANY_KEY) || null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  // A13 マルチカンパニー: 会社一覧（表示/セレクタ用。Company.rls.read=true）と
  // systemOwner の選択会社。tenant は user(company_id/app_role) + selectedCompanyId から導出。
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(readStoredSelectedCompanyId);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  // 会社一覧の読込（表示名・セレクタ用）と ATHOS フォールバック id の解決。
  // Company.rls.read=true のため全認証ユーザが参照可。失敗しても認証自体は継続（throw-safe）。
  // 注意: ここで解決する _athosCompanyId は resolveCompanyId の「データ行表示フォールバック」専用であり、
  //       ユーザ identity の会社決定（tenant.companyId）には一切使わない（§4.3b fail-closed）。
  const loadCompanies = async () => {
    try {
      const list = await base44.entities.Company.list('-created_date', 200);
      setCompanies(Array.isArray(list) ? list : []);
      const athos = (list || []).find((c) => c.code === 'ATHOS');
      configureAthosCompanyId(athos ? athos.id : null);
    } catch (error) {
      console.error('Company list load failed (non-fatal):', error);
      setCompanies([]);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      await loadCompanies();
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  // systemOwner の会社切替。null で全社横断モードへ戻す。localStorage に保持（UX のみ）。
  const setSelectedCompany = useCallback((companyId) => {
    const next = companyId || null;
    setSelectedCompanyId(next);
    try {
      if (next) window.localStorage.setItem(SELECTED_COMPANY_KEY, next);
      else window.localStorage.removeItem(SELECTED_COMPANY_KEY);
    } catch {
      /* localStorage 不可環境では保持しないだけ（致命的ではない） */
    }
  }, []);

  // テナント ctx。company_id 不在ユーザは null（fail-closed / §4.3b）。
  // selectedCompanyId は systemOwner のときのみ buildTenant 内で採用される。
  const tenant = useMemo(
    () => buildTenant(user, selectedCompanyId),
    [user, selectedCompanyId]
  );

  // 実効会社 id（表示用）: systemOwner は選択会社、未選択なら自社。他ロールは常に自社。
  const effectiveCompanyId = useMemo(() => {
    if (!tenant) return null;
    return tenant.isSystemOwner
      ? (tenant.selectedCompanyId || tenant.homeCompanyId)
      : tenant.companyId;
  }, [tenant]);

  // 表示中の会社レコード（会社名表示用）。
  const currentCompany = useMemo(
    () => companies.find((c) => c.id === effectiveCompanyId) || null,
    [companies, effectiveCompanyId]
  );

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      // A13 マルチカンパニー
      tenant,
      companies,
      reloadCompanies: loadCompanies,
      selectedCompanyId,
      setSelectedCompany,
      effectiveCompanyId,
      currentCompany
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * テナント ctx 専用の薄いフック。`buildScopedFilter` / `stampCompanyId` / `can` 等に渡す。
 * `tenant === null` は無所属（fail-closed）= 呼出側でアクセス遮断すること。
 */
export const useTenant = () => {
  const { tenant, companies, selectedCompanyId, setSelectedCompany, effectiveCompanyId, currentCompany } = useAuth();
  return { tenant, companies, selectedCompanyId, setSelectedCompany, effectiveCompanyId, currentCompany };
};
