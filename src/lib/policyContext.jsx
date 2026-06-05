import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

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

  useEffect(() => {
    base44.entities.TravelPolicyMaster.filter({ is_active: true }, '-created_date', 1)
      .then(results => {
        if (results && results.length > 0) {
          setPolicy({ ...DEFAULT_POLICY, ...results[0] });
        }
      })
      .catch(() => {});
  }, []);

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