import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface UsageLog {
  id: string;
  created_at: string;
  user_id: string;
  action_type: string;
  credits_used: number;
  metadata: any;
}

interface UsageStatsProps {
  usageLogs: UsageLog[];
  statistics: {
    totalUsed: number;
    usageByType: Record<string, number>;
    percentUsed: number;
  };
}

export function UsageStats({ usageLogs, statistics }: UsageStatsProps) {
  // Group usage by day for the chart
  const usageByDay = usageLogs.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + log.credits_used;
    return acc;
  }, {} as Record<string, number>);

  // Sort dates for the chart
  const sortedDates = Object.keys(usageByDay).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Prepare chart data
  const chartData = {
    labels: sortedDates,
    datasets: [
      {
        label: 'Credits Used',
        data: sortedDates.map(date => usageByDay[date]),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Daily Usage',
      },
    },
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Total Credits Used</h3>
          <p className="text-3xl font-bold">{statistics.totalUsed}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Usage Percentage</h3>
          <p className="text-3xl font-bold">{statistics.percentUsed.toFixed(1)}%</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Action Types</h3>
          <p className="text-3xl font-bold">{Object.keys(statistics.usageByType).length}</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Usage Over Time</h3>
        <div className="h-64">
          <Bar options={chartOptions} data={chartData} />
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Usage by Action Type</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Credits Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(statistics.usageByType).map(([actionType, credits]) => (
                <tr key={actionType}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {actionType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {credits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {statistics.totalUsed > 0 ? ((credits / statistics.totalUsed) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Recent Usage</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Credits Used
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {usageLogs.slice(0, 10).map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {log.action_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {log.credits_used}
                  </td>
                </tr>
              ))}
              {usageLogs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No usage data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}