import React from 'react';
import { pdfTheme } from './pdfTheme';

interface Props {
  id?: string;            // Optional HTML id (typically only set on first page when used inside a multi-page wrapper)
  children: React.ReactNode;
  isPreview?: boolean;    // When true, renders visibly for screen; false hides off-screen for print
}

/**
 * A4 page wrapper used by every PDF template.
 * Provides consistent paper size, padding, font, and off-screen hiding logic.
 */
export const PdfPage: React.FC<Props> = ({ id, children, isPreview = false }) => {
  return (
    <div
      id={id}
      className="pdf-page"
      style={{
        // A4 dimensions at 96 DPI: 794 × 1123 px (210 × 297 mm)
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: `${pdfTheme.space.pagePadding}px`,
        background: pdfTheme.colors.bgPage,
        color: pdfTheme.colors.text,
        fontFamily: pdfTheme.fonts.body,
        fontSize: `${pdfTheme.size.body}px`,
        lineHeight: 1.5,

        // Off-screen positioning for print-only rendering
        position: isPreview ? 'relative' : 'absolute',
        left: isPreview ? 'auto' : '-99999px',
        top: isPreview ? 'auto' : '-99999px',

        // Subtle page shadow during preview only
        boxShadow: isPreview ? '0 10px 30px rgba(15, 23, 42, 0.1)' : 'none',
        margin: isPreview ? '20px auto' : 0,
      }}
    >
      {children}
    </div>
  );
};

export default PdfPage;
