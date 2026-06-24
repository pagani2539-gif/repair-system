import React, { useState, useEffect } from 'react';

interface CounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const Counter: React.FC<CounterProps> = ({ 
  end, 
  duration = 1500, 
  prefix = '', 
  suffix = '',
  decimals = 0 
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function: easeOutExpo
      const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentCount = easing * (end - startValue) + startValue;
      setCount(currentCount);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString(undefined, { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      })}
      {suffix}
    </span>
  );
};

export default Counter;
