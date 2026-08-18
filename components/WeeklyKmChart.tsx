"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function WeeklyKmChart({ data }: { data: { week: string; km: number }[] }) {
  return (
    <div className="h-56 w-full rounded-xl border border-steel/20 bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#57647C" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#57647C" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value: number) => [`${value.toLocaleString("en-NZ")} KM`, "KM"]}
            contentStyle={{ borderRadius: 8, borderColor: "#E5E9F0", fontSize: 12 }}
          />
          <Bar dataKey="km" fill="#1365F2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
