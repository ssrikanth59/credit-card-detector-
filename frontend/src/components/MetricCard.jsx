import React from 'react';

const MetricCard = ({ title, value, icon: Icon, colorClass, changeLabel, changeValue, isPositive }) => {
  return (
    <div className="glass glow-card rounded-xl p-5 border border-dark-border flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-dark-muted tracking-wider uppercase">{title}</span>
        <div className={`p-2.5 rounded-lg bg-dark-bg/80 border border-dark-border ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
        {changeValue && (
          <div className="flex items-center mt-1.5 space-x-1.5">
            <span className={`text-xs font-bold ${isPositive ? 'text-brand-success' : 'text-brand-danger'}`}>
              {isPositive ? '+' : ''}{changeValue}
            </span>
            <span className="text-[11px] text-dark-muted font-medium">{changeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
