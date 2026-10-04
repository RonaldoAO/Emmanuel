import { useEffect, useRef } from 'react';

export interface ContextMenuState {
  x: number;
  y: number;
  label: string;
  onDelete: () => void;
}

export function ContextMenu({ state, onClose }: { state: ContextMenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="context-menu"
      role="menu"
      style={{ top: state.y, left: state.x }}
    >
      <button
        type="button"
        role="menuitem"
        className="context-menu-item"
        onClick={() => {
          state.onDelete();
          onClose();
        }}
      >
        {state.label}
      </button>
    </div>
  );
}
