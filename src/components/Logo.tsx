interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo = ({ size = 40, className = "" }: LogoProps) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, hsl(38 95% 55%) 0%, hsl(25 90% 45%) 100%)",
        boxShadow: "0 4px 14px hsl(38 90% 50% / 0.35), inset 0 1px 0 hsl(45 100% 75% / 0.5)",
      }}
      aria-label="AutoIQ"
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.6}
        height={size * 0.6}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.5 2L4 13.5h6L9 22l10-12h-6l1.5-8z"
          fill="white"
          stroke="white"
          strokeWidth="0.5"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 1px 2px hsl(20 80% 30% / 0.4))" }}
        />
      </svg>
    </div>
  );
};
