import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const HourlyForecastChart = ({ data }) => {
  const formatTime = (timestamp) => new Date(timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true });

  const chartData = data.map(hour => ({
    time: formatTime(hour.dt),
    Temperature: Math.round(hour.temp),
    'Feels Like': Math.round(hour.feels_like),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
        <XAxis dataKey="time" stroke="#CBD5E0" />
        <YAxis stroke="#CBD5E0" unit="°F" />
        <Tooltip
          contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568', color: '#FFFFFF' }}
          labelStyle={{ color: '#E2E8F0' }}
        />
        <Legend wrapperStyle={{ color: '#E2E8F0' }} />
        <Line type="monotone" dataKey="Temperature" stroke="#38B2AC" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="Feels Like" stroke="#9F7AEA" strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default HourlyForecastChart;
