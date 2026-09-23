/**
 * ArrowRight – a crisp SVG arrow icon for use inline with button/link text.
 * Renders as an inline-block SVG that aligns with surrounding text.
 */
export default function ArrowRight({
  className = "",
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`inline-block align-middle flex-shrink-0 ${className}`}
    >
      {/* Shaft */}
      <line
        x1="2"
        y1="8"
        x2="13"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <polyline
        points="8.5,3.5 13.5,8 8.5,12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
