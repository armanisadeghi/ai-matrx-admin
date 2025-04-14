import React, { useState, useEffect } from 'react';

interface TodoistTask {
  id: string;
  content: string;
  description?: string;
  due?: {
    date: string;
    string: string;
    is_recurring: boolean;
  };
  priority: number;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  completed: boolean;
  labels: string[];
}

interface TodoistTasksProps {
  token: string;
}

const TodoistTasks: React.FC<TodoistTasksProps> = ({ token }) => {
  const [tasks, setTasks] = useState<TodoistTask[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'upcoming'
  
  // Fetch tasks and projects when the component mounts
  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // For demo purposes - simulate API response with mock data
        // In production, you would fetch from 'https://api.todoist.com/rest/v2/tasks'
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        // Mock tasks data
        const mockTasks: TodoistTask[] = [
          {
            id: '1',
            content: 'Complete the OAuth integration',
            description: 'Finish the Todoist OAuth integration for the app',
            due: {
              date: '2025-04-11',
              string: 'Apr 11',
              is_recurring: false
            },
            priority: 4,
            project_id: 'p1',
            completed: false,
            labels: ['dev', 'priority']
          },
          {
            id: '2',
            content: 'Schedule team meeting',
            description: 'Discuss project roadmap for Q2',
            due: {
              date: '2025-04-12',
              string: 'Apr 12',
              is_recurring: false
            },
            priority: 3,
            project_id: 'p2',
            completed: false,
            labels: ['meeting']
          },
          {
            id: '3',
            content: 'Weekly review',
            due: {
              date: '2025-04-10',
              string: 'Today',
              is_recurring: true
            },
            priority: 2,
            project_id: 'p1',
            completed: false,
            labels: []
          },
          {
            id: '4',
            content: 'Order office supplies',
            project_id: 'p2',
            priority: 1,
            completed: true,
            labels: ['admin']
          }
        ];
        
        // Mock projects data
        const mockProjects = {
          'p1': 'Work',
          'p2': 'Personal'
        };
        
        setTasks(mockTasks);
        setProjects(mockProjects);
      } catch (err) {
        setError('Failed to fetch tasks. Please try again later.');
        console.error('Error fetching Todoist data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [token]);

  // Filter tasks based on the selected filter
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return !task.completed;
    if (filter === 'today') {
      return !task.completed && task.due?.date === '2025-04-10'; // Using a fixed date for demo
    }
    if (filter === 'upcoming') {
      return !task.completed && task.due?.date > '2025-04-10'; // Tasks due after today
    }
    return true;
  });

  // Get task priority label and class
  const getPriorityInfo = (priority: number) => {
    switch (priority) {
      case 4:
        return { label: 'P1', class: 'bg-red-100 text-red-800' };
      case 3:
        return { label: 'P2', class: 'bg-orange-100 text-orange-800' };
      case 2:
        return { label: 'P3', class: 'bg-blue-100 text-blue-800' };
      default:
        return { label: 'P4', class: 'bg-gray-100 text-gray-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Your Tasks</h3>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded-full ${filter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full ${filter === 'today' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setFilter('today')}
          >
            Today
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-full ${filter === 'upcoming' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
        </div>
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="p-6 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No tasks found for the selected filter.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredTasks.map(task => {
            const priorityInfo = getPriorityInfo(task.priority);
            
            return (
              <li key={task.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-start">
                  <div className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0">
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 border-2 border-gray-300 rounded-full text-red-600 focus:ring-red-500"
                      checked={task.completed}
                      readOnly
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-base font-medium text-gray-900 mr-auto">{task.content}</h4>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${priorityInfo.class}`}>
                        {priorityInfo.label}
                      </span>
                      {projects[task.project_id] && (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full">
                          {projects[task.project_id]}
                        </span>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {task.due && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {task.due.string} {task.due.is_recurring && '(recurring)'}
                        </span>
                      )}
                      
                      {task.labels.map(label => (
                        <span key={label} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TodoistTasks;