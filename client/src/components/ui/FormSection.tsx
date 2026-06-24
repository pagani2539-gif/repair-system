import React from 'react';

interface FormSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** 2 = ใช้ .form-grid (2 คอลัมน์ที่ >=640px), 1 = เรียงแนวตั้ง */
  columns?: 1 | 2;
  children: React.ReactNode;
}

/**
 * ครอบกลุ่มฟิลด์ในฟอร์มพร้อมหัวข้อ section ให้ทุกฟอร์มหน้าตาเหมือนกัน
 * label ของแต่ละ field ยังอยู่บน input ตามเดิม (ใช้ Input/TextArea/Select)
 */
const FormSection: React.FC<FormSectionProps> = ({ title, subtitle, icon, columns = 2, children }) => (
  <section className="form-section">
    <div className="form-section-header">
      {icon && <span className="sec-icon">{icon}</span>}
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
    <div className={columns === 1 ? 'form-section-body' : 'form-grid'}>
      {children}
    </div>
  </section>
);

export default FormSection;
