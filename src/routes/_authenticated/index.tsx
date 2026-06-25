import { createFileRoute } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

const stats = [
  { label: 'Total Contacts', value: '1,247', change: '+12% this month' },
  { label: 'Active Deals', value: '38', change: '+5 this week' },
  { label: 'Revenue', value: '$284,500', change: '+18% YTD' },
];

const recentActivity = [
  {
    title: 'New contact added',
    description: 'Jane Smith was added to your contacts',
    time: '2 hours ago',
  },
  {
    title: 'Deal moved to Negotiation',
    description: 'Acme Corp — $45,000 deal advanced',
    time: '5 hours ago',
  },
  {
    title: 'Company updated',
    description: 'Globex Inc. profile was updated',
    time: '1 day ago',
  },
  {
    title: 'New deal created',
    description: 'Initech — $12,000 initial deal',
    time: '2 days ago',
  },
];

function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Here's what's happening with your CRM today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="truncate text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="truncate text-3xl font-bold text-foreground">{stat.value}</div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentActivity.map((activity, index) => (
            <div key={activity.title}>
              {index > 0 && <Separator className="my-3" />}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{activity.title}</p>
                    <Badge variant="outline" className="shrink-0">
                      New
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{activity.time}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
