interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ title = 'Error', message, onRetry }: ErrorMessageProps) {
  return (
    <div className="mx-auto max-w-md rounded-lg bg-lcars-mars/10 dark:bg-lcars-mars-d/10 border border-lcars-mars/30 dark:border-lcars-mars-d/30 p-6 text-center">
      <h2 className="text-lg font-semibold text-lcars-mars dark:text-lcars-mars-d">{title}</h2>
      <p className="mt-2 text-sm text-lcars-mars/80 dark:text-lcars-mars-d/80">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded bg-lcars-mars dark:bg-lcars-mars-d px-4 py-2 text-sm text-white hover:opacity-80 transition-opacity"
        >
          Try again
        </button>
      )}
    </div>
  );
}
