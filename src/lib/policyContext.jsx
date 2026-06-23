import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const PolicyContext = createContext(null);

const DEFAULT_POLICY = {
  min_distance_km: 50,
  daily_allowance_daytrip: 5000,
  daily_allowance_overnight: 5000,
  daily_allowance_overseas: 10000,
  accommodation_domestic: 15000,
  accommodation_overseas: 20000,
  car_allowance_per_km: 30,
  max_work_expense: 5000,
  min_work_hours: 4,
};

export function PolicyProvider({ children }) {
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  // A13: 規程は会社ごと。現在ユーザの実効会社（systemOwner は選択会社、無ければ自社）で絞る。
  //   会社切替で再取得。無所属（null）は DEFAULT_POLICY のまま（fail-closed は計算式の安全側）。
  const { effectiveCompanyId } = useAuth();

  useEffect(() => {
    if (!effectiveCompanyId) {
      setPolicy(DEFAULT_POLICY);
      return;
    }
    base44.entities.TravelPolicyMaster.filter(
      { is_active: true, company_id: effectiveCompanyId }, '-created_date', 1
    )
      .then(results => {
        if (results && results.length > 0) {
          setPolicy({ ...DEFAULT_POLICY, ...results[0] });
        } else {
          setPolicy(DEFAULT_POLICY);
        }
      })
      .catch(() => {});
  }, [effectiveCompanyId]);

  return (
    <PolicyContext.Provider value={{ policy, setPolicy }}>
      {children}
    </PolicyContext.Provider>
  );
}

export function usePolicy() {
  const ctx = useContext(PolicyContext);
  if (!ctx) return { policy: DEFAULT_POLICY };
  return ctx;
}