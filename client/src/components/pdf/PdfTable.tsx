import React from 'react';
import { pdfTheme, type DocType } from './pdfTheme';

export interface PdfTableColumn<T> {
  key: string;
  header: string;
  width?: string;        // e.g. "60px", "20%"
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => React.ReactNode;
}

interface Props<T> {
  docType: DocType;
  title?: string;
  columns: PdfTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  showRowNumber?: boolean;
}

/**
 * Corporate-style data table for printable documents.
 * Has a thin accent stripe at the header bottom matching the doc type.
 */
export function PdfTable<T>({ docType, title, columns, rows, emptyMessage = 'ไม่มีรายการ', showRowNumber = true }: Props<T>) {
  const accentColor = pdfTheme.accents[docType];

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

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: pdfTheme.border.base,
        fontSize: pdfTheme.size.body,
        color: pdfTheme.colors.text,
      }}>
        <thead>
          <tr style={{
            background: pdfTheme.colors.bgAccent,
            borderBottom: `2px solid ${accentColor}`,
          }}>
            {showRowNumber && (
              <th style={{
                width: '36px',
                padding: '8px 6px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: pdfTheme.size.small,
                color: pdfTheme.colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRight: pdfTheme.border.light,
              }}>
                ลำดับ
              </th>
            )}
            {columns.map((col, idx) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  padding: '8px 10px',
                  textAlign: col.align || 'left',
                  fontWeight: 700,
                  fontSize: pdfTheme.size.small,
                  color: pdfTheme.colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  borderRight: idx < columns.length - 1 ? pdfTheme.border.light : 'none',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (showRowNumber ? 1 : 0)}
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: pdfTheme.colors.textLight,
                  fontStyle: 'italic',
                  fontSize: pdfTheme.size.small,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr key={rowIdx} style={{
                borderTop: rowIdx === 0 ? 'none' : pdfTheme.border.light,
                background: rowIdx % 2 === 0 ? pdfTheme.colors.bgPage : pdfTheme.colors.bgSubtle,
              }}>
                {showRowNumber && (
                  <td style={{
                    padding: '8px 6px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: pdfTheme.colors.textMuted,
                    fontFamily: pdfTheme.fonts.mono,
                    borderRight: pdfTheme.border.light,
                  }}>
                    {rowIdx + 1}
                  </td>
                )}
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '10px',
                      textAlign: col.align || 'left',
                      verticalAlign: 'top',
                      lineHeight: 1.4,
                      borderRight: colIdx < columns.length - 1 ? pdfTheme.border.light : 'none',
                    }}
                  >
                    {col.render(row, rowIdx)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

export default PdfTable;
