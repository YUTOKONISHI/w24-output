import { forwardRef, InputHTMLAttributes } from 'react';
import { FieldError } from 'react-hook-form';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: FieldError;
};

export const FormField = forwardRef<HTMLInputElement, Props>(
  ({ label, error, ...inputProps }, ref) => {
    return (
      <div>
        <label className="block text-sm font-medium text-ink mb-1">
          {label}
        </label>
        <input
          ref={ref}
          {...inputProps}
          className="w-full border border-line-strong rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
        />
        {error && (
          <p className="text-danger-600 text-sm mt-1">{error.message}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
