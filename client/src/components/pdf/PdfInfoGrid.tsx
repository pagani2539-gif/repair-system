import React from 'react';
import { pdfTheme, type DocType } from './pdfTheme';

export interface InfoField {
  label: string;
  value: React.ReactNode;
  span?: number; // Supports spanning across arbitrary columns
}

interface Props {
  title?: string;
  fields: InfoField[];
  columns?: number; // default 2
  docType?: DocType;
}

export const PdfInfoGrid: React.FC<Props> = ({ title, fields, columns = 2, docType }) => {
  const accentColor = docType ? pdfTheme.accents[docType] : null;

  return (
    <section style={{
      marginBottom: `${pdfTheme.space.sectionGap}px`,
      fontFamily: pdfTheme.fonts.body,
      background: pdfTheme.colors.bgPage,
      border: pdfTheme.border.light,
      borderLeft: accentColor ? `4px solid ${accentColor}` : pdfTheme.border.light,
      borderRadius: pdfTheme.radius.md,
      padding: '10px 14px',
      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
    }}>
      {title && (
        <h2 style={{
          fontSize: `${pdfTheme.size.h2}px`,
          fontWeight: 800,
          color: pdfTheme.colors.primary,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          margin: '0 0 8px 0',
          paddingBottom: '2px',
        }}>
          {title}
        </h2>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        columnGap: '16px',
        rowGap: '6px',
      }}>
        {fields.map((field, idx) => (
          <div
            key={idx}
            style={{
              gridColumn: field.span ? `span ${field.span}` : 'span 1',
              display: 'flex',
              flexDirection: 'column',
              padding: '2px 0',
            }}
          >
            <span style={{
              fontSize: `${pdfTheme.size.micro}px`,
              color: pdfTheme.colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              fontWeight: 600,
            }}>
              {field.label}
            </span>
            <span style={{
              fontSize: `${pdfTheme.size.body}px`,
              fontWeight: 600,
              color: pdfTheme.colors.text,
              marginTop: '1px',
              lineHeight: 1.3,
            }}>
              {field.value || <span style={{ color: pdfTheme.colors.textLight }}>—</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PdfInfoGrid;
