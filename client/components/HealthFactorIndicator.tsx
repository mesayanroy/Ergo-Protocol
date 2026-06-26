export function HealthFactorIndicator({ value }: { value: number }) {
  return <span>{value.toFixed(2)}</span>;
}