"use client";

type SentimentChoice = "positive" | "neutral" | "negative";

type SentimentSelectorProps = {
  value: SentimentChoice | null;
  onChange: (value: SentimentChoice) => void;
};

const options: { value: SentimentChoice; label: string; description: string }[] = [
  {
    value: "positive",
    label: "Positive",
    description: "Everything went well.",
  },
  {
    value: "neutral",
    label: "Neutral",
    description: "It was okay, with room to improve.",
  },
  {
    value: "negative",
    label: "Negative",
    description: "Something did not go well.",
  },
];

export function SentimentSelector({ value, onChange }: SentimentSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl border p-4 text-left transition ${
              isSelected
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
            }`}
          >
            <p className="text-sm font-semibold">{option.label}</p>
            <p
              className={`mt-1 text-xs ${
                isSelected ? "text-slate-200" : "text-slate-600"
              }`}
            >
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
