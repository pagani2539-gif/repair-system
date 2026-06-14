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
  startIndex?: number;   // running offset so row numbers continue across paginated pages
}

/**
 * Corporate-style data table for printable documents.
 * Has a thin accent stripe at the header bottom matching the doc type.
 */
export function PdfTable<T>({ docType, title, columns, rows, emptyMessage = 'ไม่มีรายการ', showRowNumber = true, startIndex = 0 }: Props<T>) {
  const accentColor = pdfTheme.accents[docType];

  return (
    <section style={{ marginBottom: `${pdfTheme.space.sectionGap}px`, fontFamily: pdfTheme.fonts.body }}>
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

      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: `${pdfTheme.size.body}px`,
        color: pdfTheme.colors.text,
      }}>
        <thead>
          <tr style={{
            background: accentColor,
            color: '#ffffff',
          }}>
            {showRowNumber && (
              <th style={{
                width: '36px',
                padding: '6px 6px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: `${pdfTheme.size.small}px`,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                borderTopLeftRadius: pdfTheme.radius.sm,
              }}>
                ลำดับ
              </th>
            )}
            {columns.map((col, idx) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  padding: '6px 10px',
                  textAlign: col.align || 'left',
                  fontWeight: 700,
                  fontSize: `${pdfTheme.size.small}px`,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  borderTopRightRadius: idx === columns.length - 1 && !showRowNumber ? pdfTheme.radius.sm : '0px',
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
                  padding: '16px',
                  textAlign: 'center',
                  color: pdfTheme.colors.textLight,
                  fontStyle: 'italic',
                  fontSize: `${pdfTheme.size.small}px`,
                  borderBottom: `1px solid ${pdfTheme.colors.border}`,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr key={rowIdx} style={{
                background: rowIdx % 2 === 0 ? pdfTheme.colors.bgPage : pdfTheme.colors.bgSubtle,
                borderBottom: `1px solid ${pdfTheme.colors.bgAccent}`,
              }}>
                {showRowNumber && (
                  <td style={{
                    padding: '6px 6px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: pdfTheme.colors.textMuted,
                    fontFamily: pdfTheme.fonts.mono,
                  }}>
                    {startIndex + rowIdx + 1}
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '8px 10px',
                      textAlign: col.align || 'left',
                      verticalAlign: 'top',
                      lineHeight: 1.3,
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
