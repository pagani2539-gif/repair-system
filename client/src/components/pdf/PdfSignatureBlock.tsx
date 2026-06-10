import React from 'react';
import { pdfTheme } from './pdfTheme';

export interface SignatureSlot {
  role: string;          // e.g. "ผู้เบิก"
  roleEn?: string;       // e.g. "Requester"
  name?: string;         // pre-filled name (optional)
  position?: string;     // job title under signature
  date?: string;         // pre-filled date (optional)
}

interface Props {
  slots: SignatureSlot[];  // typically 3 slots
  title?: string;
}

/**
 * 3-way signature block for corporate documents.
 *
 *  ─────────────────────────────────────────
 *           [signature line]
 *  (......................)
 *  ผู้เบิก / Requester
 *  วันที่ ............
 */
export const PdfSignatureBlock: React.FC<Props> = ({ slots, title = 'ลายเซ็นและการอนุมัติ' }) => {
  return (
    <section style={{
      marginTop: pdfTheme.space.sectionGap + 8,
      fontFamily: pdfTheme.fonts.body,
      pageBreakInside: 'avoid',
    }}>
      <h2 style={{
        fontSize: pdfTheme.size.h2,
        fontWeight: 800,
        color: pdfTheme.colors.text,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        margin: '0 0 16px 0',
        paddingBottom: '4px',
        borderBottom: pdfTheme.border.base,
      }}>
        {title}
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${slots.length}, 1fr)`,
        gap: '20px',
      }}>
        {slots.map((slot, idx) => (
          <div key={idx} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{
              width: '100%',
              minHeight: '54px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '6px',
            }}>
              {/* Signature image space (currently empty) */}
            </div>

            <div style={{
              width: '85%',
              borderTop: '1px dashed ' + pdfTheme.colors.textMuted,
              paddingTop: '4px',
              fontSize: pdfTheme.size.small,
              color: pdfTheme.colors.textMuted,
            }}>
              {slot.name ? (
                <div style={{
                  fontSize: pdfTheme.size.body,
                  color: pdfTheme.colors.text,
                  fontWeight: 700,
                  marginBottom: '2px',
                }}>
                  ({slot.name})
                </div>
              ) : (
                <div style={{ marginBottom: '2px' }}>
                  ( .............................. )
                </div>
              )}

              <div style={{
                fontWeight: 700,
                color: pdfTheme.colors.text,
                fontSize: pdfTheme.size.body,
                marginTop: '2px',
              }}>
                {slot.role}
              </div>
              {slot.roleEn && (
                <div style={{
                  fontSize: pdfTheme.size.micro,
                  color: pdfTheme.colors.textLight,
                  fontStyle: 'italic',
                }}>
                  {slot.roleEn}
                </div>
              )}
              {slot.position && (
                <div style={{
                  fontSize: pdfTheme.size.small,
                  marginTop: '2px',
                  color: pdfTheme.colors.textMuted,
                }}>
                  {slot.position}
                </div>
              )}
              <div style={{
                marginTop: '6px',
                fontSize: pdfTheme.size.small,
              }}>
                วันที่ {slot.date || '...... / ...... / ......'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PdfSignatureBlock;
