import React from 'react';

/**
 * Wrapper para Font Awesome Pro (cargado vía CDN en layout.tsx).
 * Pasa el nombre del icono sin el prefijo "fa-", por ejemplo:
 *   <Icon name="bed" />
 *   <Icon name="user" style="regular" />
 *   <Icon name="broom" style="duotone" color="var(--accent-c)" />
 */
export function Icon({
  name,
  style = 'solid',
  size = 16,
  color = 'currentColor',
  className,
  spin,
  fixedWidth,
}: {
  name: string;
  style?: 'solid' | 'regular' | 'light' | 'thin' | 'duotone' | 'sharp-solid';
  size?: number;
  color?: string;
  className?: string;
  spin?: boolean;
  fixedWidth?: boolean;
}) {
  return (
    <i
      className={[
        `fa-${style}`,
        `fa-${name}`,
        spin && 'fa-spin',
        fixedWidth && 'fa-fw',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ fontSize: size, color, lineHeight: 1, flexShrink: 0 }}
      aria-hidden="true"
    />
  );
}
