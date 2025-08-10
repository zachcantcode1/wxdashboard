import React from 'react';
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import ChartContainer from '@/components/ui/chart-container';
import { ChartTooltip } from '@/components/ui/chart-tooltip';

const HourlyForecastChart = ({ data }) => {
  const formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true });

  const chartData = data.map(hour => ({
    time: formatTime(hour.dt),
    Temperature: Math.round(hour.temp),
    'Feels Like': Math.round(hour.feels_like),
  }));

  return (
    <ChartContainer
      className="w-full"
      colorMap={{ temperature: '#38B2AC', 'feels-like': '#9F7AEA' }}
    >
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 24, bottom: 16 }}
        >
          <defs>
            <linearGradient id="fillTemperature" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-temperature)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-temperature)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#334155" strokeOpacity={0.4} strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#e2e8f0' }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
            tickMargin={8}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            unit="°F"
            tick={{ fill: '#e2e8f0' }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
            tickMargin={8}
          />
          <ChartTooltip unit="°F" />
          <Area type="monotone" dataKey="Temperature" fill="url(#fillTemperature)" stroke="transparent" />
          <Line type="monotone" dataKey="Temperature" stroke="var(--color-temperature)" activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="Feels Like" stroke="var(--color-feels-like)" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default HourlyForecastChart;
