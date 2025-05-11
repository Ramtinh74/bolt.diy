import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/Button';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface UsageLog {
  id: string;
  user_id: string;
  action_type: string;
  credits_used: number;
  metadata: Record<string, any>;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  username?: string;
  subscription_tier: string;
  subscription_status: string;
  usage_credits: number;
  usage_limit: number;
}

interface UsageStatsProps {
  className?: string;
}

export default function UsageStats({ className }: UsageStatsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    fetchUsageData();
  }, [timeRange]);

  const fetchUsageData = async () => {
    setIsLoading(true);
    
    try {
      // Get credentials from localStorage
      const supabaseUrl = localStorage.getItem('supabaseUrl');
      const supabaseKey = localStorage.getItem('supabaseKey');
      const stripeKey = localStorage.getItem('stripeKey');
      const authUser = localStorage.getItem('authUser');
      
      if (!supabaseUrl || !supabaseKey || !stripeKey || !authUser) {
        throw new Error('Missing required credentials');
      }
      
      const user = JSON.parse(authUser);
      
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getUserUsage',
          stripeKey,
          supabaseUrl,
          supabaseKey,
          userId: user.id,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage data');
      }
      
      setProfile(data.profile);
      setUsageLogs(data.usageLogs);
      
      // Process data for chart
      processChartData(data.usageLogs);
      
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processChartData = (logs: UsageLog[]) => {
    if (!logs || logs.length === 0) {
      setChartData(null);
      return;
    }
    
    // Filter logs based on time range
    const now = new Date();
    const daysToSubtract = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - daysToSubtract);
    
    const filteredLogs = logs.filter(log => new Date(log.created_at) >= startDate);
    
    // Group logs by day
    const groupedByDay = filteredLogs.reduce((acc, log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          totalCredits: 0,
          count: 0,
        };
      }
      
      acc[date].totalCredits += log.credits_used;
      acc[date].count += 1;
      
      return acc;
    }, {} as Record<string, { totalCredits: number; count: number }>);
    
    // Fill in missing days
    const labels: string[] = [];
    const creditsData: number[] = [];
    const countData: number[] = [];
    
    for (let i = 0; i < daysToSubtract; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (daysToSubtract - i - 1));
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(dateStr);
      
      if (groupedByDay[dateStr]) {
        creditsData.push(groupedByDay[dateStr].totalCredits);
        countData.push(groupedByDay[dateStr].count);
      } else {
        creditsData.push(0);
        countData.push(0);
      }
    }
    
    // Format labels for display
    const formattedLabels = labels.map(dateStr => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    setChartData({
      labels: formattedLabels,
      datasets: [
        {
          label: 'Credits Used',
          data: creditsData,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Request Count',
          data: countData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
          hidden: true,
        },
      ],
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <motion.div
      className={classNames(
        'bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="i-ph:chart-line-up-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Usage Statistics</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
            className="text-xs px-2 py-1 h-auto"
          >
            7 Days
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
            className="text-xs px-2 py-1 h-auto"
          >
            30 Days
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
            className="text-xs px-2 py-1 h-auto"
          >
            90 Days
          </Button>
        </div>
      </div>
      
      {profile && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3">
            <div className="text-xs text-bolt-elements-textSecondary">Current Plan</div>
            <div className="text-lg font-semibold text-bolt-elements-textPrimary capitalize mt-1">
              {profile.subscription_tier}
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3">
            <div className="text-xs text-bolt-elements-textSecondary">Credits Remaining</div>
            <div className="text-lg font-semibold text-bolt-elements-textPrimary mt-1">
              {profile.usage_credits} / {profile.usage_limit}
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3">
            <div className="text-xs text-bolt-elements-textSecondary">Status</div>
            <div className="text-lg font-semibold text-bolt-elements-textPrimary capitalize mt-1">
              {profile.subscription_status}
            </div>
          </div>
        </div>
      )}
      
      <div className="h-64 mt-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin i-ph:spinner w-6 h-6 text-purple-500" />
          </div>
        ) : chartData ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-bolt-elements-textSecondary">No usage data available</div>
          </div>
        )}
      </div>
      
      {usageLogs && usageLogs.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-bolt-elements-textPrimary mb-2">Recent Activity</div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-2 px-2 text-bolt-elements-textSecondary font-medium">Date</th>
                  <th className="text-left py-2 px-2 text-bolt-elements-textSecondary font-medium">Action</th>
                  <th className="text-right py-2 px-2 text-bolt-elements-textSecondary font-medium">Credits</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.slice(0, 5).map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-2 text-bolt-elements-textSecondary">
                      {new Date(log.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-2 text-bolt-elements-textPrimary">
                      {log.action_type}
                    </td>
                    <td className="py-2 px-2 text-bolt-elements-textSecondary text-right">
                      {log.credits_used}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}