import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TimeChart({ data }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md">
      <h3 className="text-lg font-black mb-4">Time Spent This Week</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis unit="min" />
          <Tooltip />
          <Bar dataKey="minutes" fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}