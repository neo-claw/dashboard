'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DataPoint {
  timestamp: string;
  cpu: number;
  memory: number;
}

interface SparklineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export default function SparklineChart({
  data,
  width = 200,
  height = 80,
  strokeWidth = 2,
  className,
}: SparklineChartProps) {
  const [svgData, setSvgData] = useState<{ pathCpu: string; pathMem: string; scales: { cpu: { min: number; max: number }; mem: { min: number; max: number } } } | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) {
      setSvgData(null);
      return;
    }

    const points = data.map(d => ({ cpu: d.cpu, memory: d.memory }));
    const cpuValues = points.map(p => p.cpu);
    const memValues = points.map(p => p.memory);

    const minCpu = Math.max(0, Math.floor(Math.min(...cpuValues) * 0.9));
    const maxCpu = Math.ceil(Math.max(...cpuValues) * 1.1);
    const minMem = Math.max(0, Math.floor(Math.min(...memValues) * 0.9));
    const maxMem = Math.ceil(Math.max(...memValues) * 1.1);

    const xStep = width / (points.length - 1);

    const cpuPath = points.map((p, i) => {
      const x = i * xStep;
      const y = height - ((p.cpu - minCpu) / (maxCpu - minCpu)) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const memPath = points.map((p, i) => {
      const x = i * xStep;
      const y = height - ((p.memory - minMem) / (maxMem - minMem)) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    setSvgData({
      pathCpu: cpuPath,
      pathMem: memPath,
      scales: { cpu: { min: minCpu, max: maxCpu }, mem: { min: minMem, max: maxMem } },
    });
  }, [data, width, height]);

  if (!svgData) {
    return <div className={cn('flex items-center justify-center text-xs text-muted', className)}>No data</div>;
  }

  return (
    <svg width={width} height={height} className={className}>
      {/* Grid lines */}
      <line x1={0} y1={height} x2={width} y2={height} stroke="currentColor" strokeOpacity={0.1} />
      <line x1={0} y1={0} x2={width} y2={0} stroke="currentColor" strokeOpacity={0.1} />
      {/* CPU line */}
      <path d={svgData.pathCpu} fill="none" stroke="#00ff9d" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {/* Memory line */}
      <path d={svgData.pathMem} fill="none" stroke="#60a5fa" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
    </svg>
  );
}
