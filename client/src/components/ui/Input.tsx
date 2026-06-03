import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  id,
  required,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <input id={inputId} className={`form-control ${className}`} required={required} {...props} />
      {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{error}</span>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  id,
  required,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <textarea id={inputId} className={`form-control ${className}`} required={required} {...props} />
      {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{error}</span>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options = [],
  className = '',
  id,
  required,
  children,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <select id={inputId} className={`form-control ${className}`} required={required} {...props}>
        {children || options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{error}</span>}
    </div>
  );
};

export default Input;
