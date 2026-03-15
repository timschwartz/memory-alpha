interface LoadingSpinnerProps {
  text?: string;
}

export default function LoadingSpinner({ text = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-lcars-peach dark:border-lcars-peach-d border-t-lcars-amber dark:border-t-lcars-amber-d" />
      <p className="mt-3 text-sm text-lcars-gray dark:text-lcars-gray-d">{text}</p>
    </div>
  );
}
