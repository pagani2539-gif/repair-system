import React from 'react';
import { UPLOAD_URL } from '../../api';
import type { Company, CompanyLogo } from '../../types';
import { pdfTheme, docLabels, type DocType } from './pdfTheme';

interface Props {
  docType: DocType;
  docNumber: string;       // e.g. "WD-000019"
  docDate: string;         // formatted date string
  company: Company | null;
  logo: CompanyLogo | null;
  statusBadge?: { label: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' };
}

/**
 * Corporate document header.
 *
 *  ┌──────────────────────────────────────────────────────┐
 *  │ [LOGO]  COMPANY NAME (TH)         │  DOC TITLE        │
 *  │         Company Name (EN)          │  ──────────       │
 *  │         Address line 1             │  No.  WD-000019   │
 *  │         Tel · Email · Tax ID       │  Date 8 มิ.ย. 2569 │
 *  ├──────────────────────────────────────────────────────┤
 *  │       <<accent stripe>>                              │
 *  └──────────────────────────────────────────────────────┘
 */
export const PdfHeader: React.FC<Props> = ({ docType, docNumber, docDate, company, logo, statusBadge }) => {
  const labels = docLabels[docType];
  const accentColor = pdfTheme.accents[docType];

  const toneColors = {
    success: { bg: '#d1fae5', text: '#065f46' },
    warning: { bg: '#fef3c7', text: '#78350f' },
    danger:  { bg: '#fee2e2', text: '#7f1d1d' },
    neutral: { bg: pdfTheme.colors.bgAccent, text: pdfTheme.colors.textMuted },
  };
  const badgeColors = statusBadge ? toneColors[statusBadge.tone || 'neutral'] : null;

  return (
    <header style={{ marginBottom: pdfTheme.space.sectionGap }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: pdfTheme.space.sectionGap,
        alignItems: 'flex-start',
      }}>
        {/* ─── Left: Company Block ─── */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          {logo && (
            <div style={{
              width: '72px',
              height: '72px',
              flexShrink: 0,
              border: pdfTheme.border.light,
              borderRadius: pdfTheme.radius.md,
              padding: '4px',
              background: pdfTheme.colors.bgPage,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={`${UPLOAD_URL}/uploads/${logo.file_path}`}
                alt={logo.label}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                crossOrigin="anonymous"
              />
            </div>
          )}

          <div style={{ flex: 1, fontFamily: pdfTheme.fonts.body, color: pdfTheme.colors.text }}>
            <div style={{
              fontSize: pdfTheme.size.h2 + 2,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}>
              {company?.name_th || 'บริษัทของคุณ'}
            </div>
            {company?.name_en && (
              <div style={{
                fontSize: pdfTheme.size.small,
                color: pdfTheme.colors.textMuted,
                fontWeight: 500,
                marginTop: '2px',
              }}>
                {company.name_en}
              </div>
            )}
            {company?.address && (
              <div style={{
                fontSize: pdfTheme.size.small,
                color: pdfTheme.colors.textMuted,
                marginTop: '6px',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
              }}>
                {company.address}
              </div>
            )}
            <div style={{
              fontSize: pdfTheme.size.micro,
              color: pdfTheme.colors.textLight,
              marginTop: '4px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {company?.phone && <span>โทร. {company.phone}</span>}
              {company?.email && <span>· {company.email}</span>}
              {company?.tax_id && <span>· เลขผู้เสียภาษี {company.tax_id}</span>}
              {company?.website && <span>· {company.website}</span>}
            </div>
          </div>
        </div>

        {/* ─── Right: Document Meta ─── */}
        <div style={{
          border: pdfTheme.border.base,
          borderRadius: pdfTheme.radius.md,
          padding: '14px 18px',
          background: pdfTheme.colors.bgSubtle,
          fontFamily: pdfTheme.fonts.body,
        }}>
          <div style={{
            fontSize: pdfTheme.size.docTitle,
            fontWeight: 800,
            color: pdfTheme.colors.text,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}>
            {labels.th}
          </div>
          <div style={{
            fontSize: pdfTheme.size.docSubtitle,
            fontWeight: 500,
            color: pdfTheme.colors.textMuted,
            marginTop: '2px',
            letterSpacing: '0.01em',
          }}>
            {labels.en}
          </div>

          <div style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: pdfTheme.border.light,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: '12px',
            rowGap: '4px',
            fontSize: pdfTheme.size.body,
          }}>
            <span style={{ color: pdfTheme.colors.textMuted }}>เลขที่:</span>
            <span style={{
              fontFamily: pdfTheme.fonts.mono,
              fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.04em',
            }}>{docNumber}</span>
            <span style={{ color: pdfTheme.colors.textMuted }}>วันที่:</span>
            <span style={{ fontWeight: 600, color: pdfTheme.colors.text }}>{docDate}</span>
            {statusBadge && badgeColors && (
              <>
                <span style={{ color: pdfTheme.colors.textMuted }}>สถานะ:</span>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: pdfTheme.radius.sm,
                  background: badgeColors.bg,
                  color: badgeColors.text,
                  fontWeight: 700,
                  fontSize: pdfTheme.size.small,
                  width: 'fit-content',
                }}>
                  {statusBadge.label}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Accent Stripe ─── */}
      <div style={{
        height: '4px',
        background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor} 70%, ${pdfTheme.colors.primary} 100%)`,
        marginTop: '14px',
        borderRadius: pdfTheme.radius.sm,
      }} />
    </header>
  );
};

export default PdfHeader;
