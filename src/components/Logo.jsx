/**
 * LaunchPard Logo component
 *
 * Uses logo192.png (transparent background) — renders correctly on both
 * light and dark backgrounds.
 *
 * Props:
 *   size        {number}  — pixel size of the logo image (default 36)
 *   showText    {boolean} — show "LaunchPard" wordmark next to logo (default true)
 *   className   {string}  — extra classes on the wrapper div
 *   textClass   {string}  — extra classes on the wordmark span
 */
import Image from 'next/image';

export default function Logo({
  size = 36,
  showText = true,
  className = '',
  textClass = '',
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo192.png"
        alt="LaunchPard"
        width={size}
        height={size}
        priority
        style={{ width: size, height: size }}
      />
      {showText && (
        <span
          className={`font-black tracking-tight leading-none ${textClass}`}
          style={{ fontSize: size * 0.56 }}
        >
          LaunchPard
        </span>
      )}
    </div>
  );
}
