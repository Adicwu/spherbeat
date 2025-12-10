import React from 'react';

interface SciFiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
  label?: string;
  as?: React.ElementType;
}

export const SciFiButton: React.FC<SciFiButtonProps> = ({ 
  active, 
  icon, 
  label, 
  className = '', 
  children,
  as: Component = 'button',
  ...props 
}) => {
  const Tag = Component as any;
  
  return (
    <Tag
      className={`
        relative group flex items-center justify-center gap-2 px-4 py-2 
        border border-cyan-900/50 rounded-sm transition-all duration-300
        hover:border-sci-cyan/50 hover:bg-cyan-900/20 hover:text-sci-cyan hover:shadow-[0_0_10px_rgba(0,243,255,0.2)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${active ? 'bg-cyan-900/30 text-sci-cyan border-sci-cyan shadow-[0_0_15px_rgba(0,243,255,0.3)]' : 'bg-transparent text-gray-400'}
        ${className}
      `}
      {...props}
    >
      {/* Corner accents */}
      <span className="absolute top-0 left-0 w-1 h-1 border-t border-l border-sci-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-sci-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {icon && <span className="w-5 h-5">{icon}</span>}
      {label && <span className="font-mono text-xs tracking-wider uppercase">{label}</span>}
      {children}
    </Tag>
  );
};