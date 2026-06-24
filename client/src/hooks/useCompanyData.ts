import { useEffect, useState } from 'react';
import { settingsApi } from '../api';
import type { Company, CompanyLogo } from '../types';

interface CompanyData {
  company: Company | null;
  logo: CompanyLogo | null;
  loading: boolean;
}

/**
 * Hook for PDF templates to auto-load the current company + its logo.
 *
 * Usage:
 *   const { company, logo } = useCompanyData(companyId, logoId);
 *
 * - companyId omitted → falls back to the system's default company
 * - logoId omitted → uses the company's default logo
 * - logoId provided → uses that specific logo (if it belongs to the company)
 *
 * Returns null while loading so templates can render skeletons or fallbacks.
 */
export function useCompanyData(companyId?: number | null, logoId?: number | null): CompanyData {
  const [data, setData] = useState<CompanyData>({
    company: null,
    logo: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const companies = await settingsApi.getCompanies();
        if (cancelled) return;

        let target: Company | undefined;
        if (companyId && companyId !== -1) {
          target = companies.find((c) => c.id === companyId);
        }
        if (!target && companyId !== -1) {
          target = companies.find((c) => c.is_default === 1) || companies[0];
        }
        if (!target) {
          setData({ company: null, logo: null, loading: false });
          return;
        }

        const logos = await settingsApi.getLogos(target.id);
        if (cancelled) return;

        let chosenLogo: CompanyLogo | null = null;
        if (logoId) {
          chosenLogo = logos.find((l) => l.id === logoId) || null;
        }
        if (!chosenLogo) {
          chosenLogo = logos.find((l) => l.is_default === 1) || logos[0] || null;
        }

        setData({ company: target, logo: chosenLogo, loading: false });
      } catch {
        if (!cancelled) {
          setData({ company: null, logo: null, loading: false });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [companyId, logoId]);

  return data;
}
