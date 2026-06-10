import React from 'react';
import type { Company } from '../../types';
import { pdfTheme, type DocType } from './pdfTheme';

interface Props {
  docType: DocType;
  docNumber: string;
  company: Company | null;
  pageNumber?: number;
  totalPages?: number;
  printedAt?: string; // formatted date string
}

/**
 * Compact footer for printed documents.
 * Layout (3-column):
 *   [Doc ID / printed]     [Company short]      [Page X / Y]
 */
export const PdfFooter: React.FC<Props> = ({ docType, docNumber, company, pageNumber, totalPages, printedAt }) => {
  const accentColor = pdfTheme.accents[docType];

  return (
    <footer style={{
      marginTop: pdfTheme.space.sectionGap,
      paddingTop: '10px',
      borderTop: `2px solid ${accentColor}`,
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: '12px',
      fontFamily: pdfTheme.fonts.body,
      fontSize: pdfTheme.size.micro,
      color: pdfTheme.colors.textMuted,
    }}>
      <div>
        <span style={{ fontFamily: pdfTheme.fonts.mono, fontWeight: 700, color: pdfTheme.colors.text }}>
          {docNumber}
        </span>
        {printedAt && (
          <span style={{ marginLeft: '8px' }}>
            พิมพ์เมื่อ {printedAt}
          </span>
        )}
      </div>

      <div style={{ textAlign: 'center', fontWeight: 600 }}>
        {company?.name_short || company?.name_th || ''}
      </div>

      <div style={{ textAlign: 'right' }}>
        {pageNumber && totalPages
          ? `หน้า ${pageNumber} / ${totalPages}`
          : 'เอกสารฉบับนี้พิมพ์จากระบบ'}
      </div>
    </footer>
  );
};

export default PdfFooter;
