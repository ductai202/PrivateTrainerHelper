'use client';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export interface MeasurementPoint {
  date: string;
  weight: number | null;
  waist: number | null;
}

export default function MeasurementChart({ data }: { data: MeasurementPoint[] }) {
  return (
    <div data-testid="measurement-chart" className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
          <Legend />
          <Line type="monotone" dataKey="weight" name="Cân nặng" stroke="#0f766e" connectNulls />
          <Line type="monotone" dataKey="waist" name="Vòng eo" stroke="#b45309" connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
