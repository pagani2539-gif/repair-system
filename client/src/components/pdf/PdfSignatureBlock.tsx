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
      marginTop: `${pdfTheme.space.sectionGap + 4}px`,
      fontFamily: pdfTheme.fonts.body,
      pageBreakInside: 'avoid',
    }}>
      <h2 style={{
        fontSize: `${pdfTheme.size.h2}px`,
        fontWeight: 800,
        color: pdfTheme.colors.primary,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '0 0 10px 0',
      }}>
        {title}
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${slots.length}, 1fr)`,
        gap: '12px',
      }}>
        {slots.map((slot, idx) => (
          <div
            key={idx}
            style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: pdfTheme.radius.md,
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Circular Stamp Watermark */}
            <div style={{
              position: 'absolute',
              right: '6px',
              bottom: '6px',
              width: '42px',
              height: '42px',
              border: '1px dashed rgba(148, 163, 184, 0.25)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '6.5px',
              color: 'rgba(148, 163, 184, 0.25)',
              fontWeight: 700,
              textTransform: 'uppercase',
              transform: 'rotate(-15deg)',
              pointerEvents: 'none',
              letterSpacing: '0.05em',
            }}>
              Stamp
            </div>

            {/* Signature Area */}
            <div style={{
              width: '85%',
              height: '36px',
              borderBottom: `1px dotted ${pdfTheme.colors.textLight}`,
              marginBottom: '6px',
            }} />

            {/* Name Slot */}
            <div style={{ width: '90%', fontSize: `${pdfTheme.size.small}px`, color: pdfTheme.colors.textMuted }}>
              {slot.name ? (
                <div style={{
                  fontSize: `${pdfTheme.size.body}px`,
                  color: pdfTheme.colors.text,
                  fontWeight: 700,
                  marginBottom: '2px',
                }}>
                  ({slot.name})
                </div>
              ) : (
                <div style={{ marginBottom: '2px', color: pdfTheme.colors.textLight }}>
                  ( .................................................. )
                </div>
              )}

              {/* Role Title */}
              <div style={{
                fontWeight: 700,
                color: pdfTheme.colors.text,
                fontSize: `${pdfTheme.size.body}px`,
                marginTop: '1px',
              }}>
                {slot.role}
              </div>

              {slot.roleEn && (
                <div style={{
                  fontSize: `${pdfTheme.size.micro}px`,
                  color: pdfTheme.colors.textLight,
                  fontStyle: 'italic',
                }}>
                  {slot.roleEn}
                </div>
              )}

              {slot.position && (
                <div style={{
                  fontSize: `${pdfTheme.size.micro}px`,
                  marginTop: '1px',
                  color: pdfTheme.colors.textMuted,
                }}>
                  {slot.position}
                </div>
              )}

              {/* Date */}
              <div style={{
                marginTop: '4px',
                fontSize: `${pdfTheme.size.small}px`,
                color: pdfTheme.colors.textMuted,
              }}>
                วันที่ {slot.date || '........ / ........ / ........'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PdfSignatureBlock;
