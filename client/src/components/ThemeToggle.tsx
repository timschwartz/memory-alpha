import { useTheme } from '../hooks/useTheme';

const options = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'auto' as const, label: 'Auto' },
];

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-lcars-lilac/30 dark:border-lcars-lilac-d/30">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setPreference(opt.value)}
          className={`px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcars-blue dark:focus-visible:ring-lcars-blue-d ${
            preference === opt.value
              ? 'bg-lcars-amber dark:bg-lcars-amber-d text-lcars-black'
              : 'bg-lcars-surface dark:bg-lcars-surface-d text-lcars-gray dark:text-lcars-gray-d hover:bg-lcars-peach dark:hover:bg-lcars-peach-d'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
