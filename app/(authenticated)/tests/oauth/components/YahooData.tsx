import React, { useState, useEffect } from 'react';

interface YahooEmail {
  id: string;
  subject: string;
  from: {
    name?: string;
    email: string;
  };
  receivedDate: string;
  isRead: boolean;
  hasAttachment: boolean;
  snippet: string;
}

interface YahooEvent {
  id: string;
  title: string;
  location?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  organizer: {
    name?: string;
    email: string;
  };
  description?: string;
}

interface YahooDataProps {
  token: string;
}

const YahooData: React.FC<YahooDataProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState('email');
  const [emails, setEmails] = useState<YahooEmail[]>([]);
  const [events, setEvents] = useState<YahooEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch emails and events when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // For demo purposes - simulate API response with mock data
        // In production, you would fetch from Yahoo API endpoints
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        // Mock emails data
        const mockEmails: YahooEmail[] = [
          {
            id: 'email1',
            subject: 'Weekly Team Meeting Notes',
            from: {
              name: 'Jane Manager',
              email: 'jane.manager@example.com'
            },
            receivedDate: '2025-04-12T09:23:45',
            isRead: true,
            hasAttachment: true,
            snippet: 'Here are the notes from our weekly team meeting. We discussed the roadmap for...'
          },
          {
            id: 'email2',
            subject: 'Your Amazon Order Has Shipped',
            from: {
              name: 'Amazon',
              email: 'ship-confirm@amazon.com'
            },
            receivedDate: '2025-04-11T16:32:10',
            isRead: true,
            hasAttachment: false,
            snippet: 'Your order of "Wireless Headphones" has shipped. Expected delivery date: April 14...'
          },
          {
            id: 'email3',
            subject: 'Invitation: Product Launch Event',
            from: {
              name: 'Marketing Team',
              email: 'marketing@company.com'
            },
            receivedDate: '2025-04-11T11:05:22',
            isRead: false,
            hasAttachment: true,
            snippet: 'You are invited to our upcoming product launch event on April 20. Please RSVP...'
          },
          {
            id: 'email4',
            subject: 'Your Monthly Report',
            from: {
              name: 'Analytics System',
              email: 'noreply@analytics.com'
            },
            receivedDate: '2025-04-10T08:15:30',
            isRead: false,
            hasAttachment: true,
            snippet: 'Your monthly analytics report is ready. Key highlights: Traffic up 12%, Conversion...'
          }
        ];
        
        // Mock calendar events data
        const mockEvents: YahooEvent[] = [
          {
            id: 'event1',
            title: 'Weekly Team Meeting',
            location: 'Conference Room A',
            start: '2025-04-15T10:00:00',
            end: '2025-04-15T11:00:00',
            isAllDay: false,
            organizer: {
              name: 'Jane Manager',
              email: 'jane.manager@example.com'
            },
            description: 'Weekly team sync to discuss ongoing projects and priorities.'
          },
          {
            id: 'event2',
            title: 'Product Launch Preparation',
            location: 'Main Office',
            start: '2025-04-18T14:00:00',
            end: '2025-04-18T16:30:00',
            isAllDay: false,
            organizer: {
              name: 'Marketing Team',
              email: 'marketing@company.com'
            },
            description: 'Final preparations for the April 20 product launch event.'
          },
          {
            id: 'event3',
            title: 'Company Holiday',
            start: '2025-04-22T00:00:00',
            end: '2025-04-22T23:59:59',
            isAllDay: true,
            organizer: {
              name: 'HR Department',
              email: 'hr@company.com'
            }
          },
          {
            id: 'event4',
            title: 'Quarterly Review',
            location: 'Executive Boardroom',
            start: '2025-04-25T09:00:00',
            end: '2025-04-25T12:00:00',
            isAllDay: false,
            organizer: {
              name: 'Executive Team',
              email: 'exec@company.com'
            },
            description: 'Q1 2025 performance review meeting with all department heads.'
          }
        ];
        
        setEmails(mockEmails);
        setEvents(mockEvents);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching Yahoo data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date for calendar display
  const formatCalendarDate = (dateString: string, isAllDay: boolean) => {
    const date = new Date(dateString);
    if (isAllDay) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      });
    }
    return date.toLocaleString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (isLoading) {
    return (
      <div className="mt-6 p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
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
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'email' 
            ? 'text-purple-700 border-b-2 border-purple-700' 
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('email')}
        >
          Emails
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'calendar' 
            ? 'text-purple-700 border-b-2 border-purple-700' 
            : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
      </div>
      
      {activeTab === 'email' && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-4">Recent Emails</h3>
          {emails.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">No emails found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map(email => (
                <div 
                  key={email.id} 
                  className={`p-4 border rounded-lg ${!email.isRead ? 'bg-purple-50' : 'bg-white'}`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className={`text-base ${!email.isRead ? 'font-semibold' : 'font-medium'}`}>
                      {email.subject}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {formatDate(email.receivedDate)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    From: {email.from.name} &lt;{email.from.email}&gt;
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{email.snippet}</p>
                  <div className="mt-2 flex items-center">
                    {email.hasAttachment && (
                      <span className="inline-flex items-center text-xs text-gray-500">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Attachment
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
          {events.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">No events found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex justify-between items-start">
                    <h4 className="text-base font-medium">{event.title}</h4>
                    {event.isAllDay && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        All Day
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {formatCalendarDate(event.start, event.isAllDay)}
                      {!event.isAllDay && ` - ${formatCalendarDate(event.end, event.isAllDay)}`}
                    </span>
                  </div>
                  
                  {event.location && (
                    <div className="mt-1 flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  <div className="mt-1 text-sm text-gray-600">
                    Organizer: {event.organizer.name || event.organizer.email}
                  </div>
                  
                  {event.description && (
                    <p className="mt-2 text-sm text-gray-700">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default YahooData;