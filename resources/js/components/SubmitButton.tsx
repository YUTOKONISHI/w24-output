type Props = {
  isSubmitting: boolean;
  label: string;
  loadingLabel: string;
};

export function SubmitButton({ isSubmitting, label, loadingLabel }: Props) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition disabled:opacity-50"
    >
      {isSubmitting ? loadingLabel : label}
    </button>
  );
}
