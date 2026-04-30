import type { ReactNode, CSSProperties } from 'react';

type Edge = 'top' | 'bottom' | 'left' | 'right';

/**
 * Adds iOS notch / Android gesture-bar padding using CSS env(safe-area-inset-*).
 * Pass `edges` to control which sides get padding (defaults to top + bottom).
 */
export function SafeArea({
  children,
  edges = ['top', 'bottom'],
  className,
}: {
  children: ReactNode;
  edges?: readonly Edge[];
  className?: string;
}) {
  const style: CSSProperties = {};
  if (edges.includes('top')) style.paddingTop = 'env(safe-area-inset-top)';
  if (edges.includes('bottom')) style.paddingBottom = 'env(safe-area-inset-bottom)';
  if (edges.includes('left')) style.paddingLeft = 'env(safe-area-inset-left)';
  if (edges.includes('right')) style.paddingRight = 'env(safe-area-inset-right)';
  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
