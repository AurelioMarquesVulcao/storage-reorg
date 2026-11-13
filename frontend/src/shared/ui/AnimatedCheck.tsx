
interface AnimatedCheckProps {
  size?: number
}

export default function AnimatedCheck({ size = 48 }: AnimatedCheckProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="concluído"
      style={{ display: 'block' }}
    >
      <circle cx="24" cy="24" r="22" fill="rgba(34,197,94,0.15)" stroke="#4ade80" strokeWidth="2" />
      <polyline
        points="13,25 21,33 36,16"
        stroke="#4ade80"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 40,
          strokeDashoffset: 0,
          animation: 'drawCheck 0.4s ease forwards',
        }}
      />
    </svg>
  )
}
