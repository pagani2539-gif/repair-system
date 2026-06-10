import React from 'react';
import { pdfTheme } from './pdfTheme';

export interface InfoField {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2; // 2 = full-width row
}

interface Props {
  title?: string;
  fields: InfoField[];
  columns?: number; // default 2
}

/**
 * Information grid for headline doc info (recipient, project, location, etc.)
 * Rendered as a clean key-value grid with subtle backgrounds.
 */
export const PdfInfoGrid: React.FC<Props> = ({ title, fields, columns = 2 }) => {
  return (
    <section style={{ marginBottom: pdfTheme.space.sectionGap, fontFamily: pdfTheme.fonts.body }}>
      {title && (
        <h2 style={{
          fontSize: pdfTheme.size.h2,
          fontWeight: 800,
          color: pdfTheme.colors.text,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          margin: '0 0 10px 0',
          paddingBottom: '4px',
          borderBottom: pdfTheme.border.base,
        }}>
          {title}
        </h2>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '0',
        border: pdfTheme.border.light,
        borderRadius: pdfTheme.radius.md,
        overflow: 'hidden',
      }}>
        {fields.map((field, idx) => (
          <div
            key={idx}
            style={{
              gridColumn: field.span === 2 ? `span ${columns}` : 'span 1',
              borderBottom: idx < fields.length - 1 ? pdfTheme.border.light : 'none',
              borderRight: (idx % columns) < columns - 1 && field.span !== 2 ? pdfTheme.border.light : 'none',
              padding: '10px 14px',
              background: idx % 2 === 0 ? pdfTheme.colors.bgSubtle : pdfTheme.colors.bgPage,
              fontSize: pdfTheme.size.body,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{
              fontSize: pdfTheme.size.micro,
              color: pdfTheme.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}>
              {field.label}
            </div>
            <div style={{
              fontSize: pdfTheme.size.body,
              fontWeight: 600,
              color: pdfTheme.colors.text,
              lineHeight: 1.4,
            }}>
              {field.value || <span style={{ color: pdfTheme.colors.textLight }}>—</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PdfInfoGrid;
