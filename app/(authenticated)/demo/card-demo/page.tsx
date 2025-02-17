import AppletGrid, { Applet } from "@/components/applet/apps/AppletCard";

export default function Demo() {
    const sampleApplets: Applet[] = [
        {
          id: '1',
          name: 'Las Vegas Party Trip Planner',
          description: 'Plan your perfect Las Vegas party trip with our comprehensive planner.',
          creator: 'Armani Sadeghi',
          imageUrl: 'https://images.unsplash.com/photo-1614974121916-81eadb4dd6b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2NjE4MDZ8MHwxfHNlYXJjaHw5fHxsYXMlMjBWZWdhc3xlbnwwfHx8fDE3Mzk3NzI3NDJ8MA&ixlib=rb-4.0.3&q=80&w=1080'
        },
        {
          id: '2',
          name: 'Task Manager',
          description: 'Streamline your workflow with our intuitive task management system.',
          creator: 'Sarah Chen',
          imageUrl: '/api/placeholder/400/200'
        },
        {
          id: '3',
          name: 'Report Generator',
          description: 'Create professional reports in minutes with customizable templates.',
          creator: 'Michael Rodriguez',
          imageUrl: '/api/placeholder/400/200'
        }
      ];
      
    return <AppletGrid applets={sampleApplets} />;
  };
  
