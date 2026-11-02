"use client";

import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface DayTotals {
  key: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function WeeklyChart({ days, calorieGoal }: { days: DayTotals[]; calorieGoal: number }) {
  return (
    <div className="space-y-6">
      <figure>
        <figcaption className="mb-2 font-semibold">Calories per day</figcaption>
        <div className="h-56 w-full" role="img" aria-label={`Calories per day: ${days.map((d) => `${d.label} ${Math.round(d.calories)}`).join(", ")}`}>
          <ResponsiveContainer>
            <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="#E4E8DE" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip formatter={(v: number) => [`${Math.round(v)} kcal`, "Calories"]} cursor={{ fill: "#F0F8F2" }} />
              <ReferenceLine y={calorieGoal} stroke="#15231B" strokeDasharray="4 4" label={{ value: "Goal", position: "insideTopRight", fontSize: 12 }} />
              <Bar dataKey="calories" fill="#2F9E5B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure>
        <figcaption className="mb-2 font-semibold">Protein, carbs and fat (grams)</figcaption>
        <div className="h-56 w-full" role="img" aria-label="Stacked bars of protein, carbohydrates and fat in grams per day">
          <ResponsiveContainer>
            <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="#E4E8DE" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip formatter={(v: number, n: string) => [`${Math.round(v)} g`, n]} cursor={{ fill: "#F0F8F2" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="protein" name="Protein" stackId="m" fill="#2F9E5B" />
              <Bar dataKey="carbs" name="Carbs" stackId="m" fill="#E3A21A" />
              <Bar dataKey="fat" name="Fat" stackId="m" fill="#E2694F" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
