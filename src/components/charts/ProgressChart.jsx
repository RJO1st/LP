"use client";
import React from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from "recharts";

export default function ProgressChart({ data, color = "#6366f1" }) {
  // Expected data format: [{ date: '2023-10-01', accuracy: 85 }, ...]
  
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-[32px] border-4 border-dashed border-slate-100">
        <p className="text-slate-400 font-bold italic">No quest data available yet.</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }}
            dy={10}
          />
          <YAxis 
            domain={[0, 100]} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900 }}
          />
          <Area 
            type="monotone" 
            dataKey="accuracy" 
            stroke={color} 
            strokeWidth={4} 
            fillOpacity={1} 
            fill="url(#colorAcc)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
