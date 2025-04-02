// lib/googleScopes.ts

export const googleServices = {
    drive: {
      name: "Google Drive",
      scope: "https://www.googleapis.com/auth/drive",
      description: "Access, upload, and manage your Drive files",
      color: "#0F9D58", // Google Drive green
      icon: "drive"
    },
    gmail: {
      name: "Gmail",
      scope: "https://www.googleapis.com/auth/gmail.send",
      description: "Access and send emails from your Gmail account",
      color: "#D14836", // Gmail red
      icon: "gmail"
    },
    calendar: {
      name: "Google Calendar",
      scope: "https://www.googleapis.com/auth/calendar",
      description: "Access and manage your calendar events",
      color: "#4285F4", // Calendar blue
      icon: "calendar"
    },
    docs: {
      name: "Google Docs",
      scope: "https://www.googleapis.com/auth/documents",
      description: "Access, view and edit your documents",
      color: "#4285F4", // Docs blue
      icon: "docs"
    },
    sheets: {
      name: "Google Sheets",
      scope: "https://www.googleapis.com/auth/spreadsheets",
      description: "Access, view and edit your spreadsheets",
      color: "#0F9D58", // Sheets green
      icon: "sheets"
    },
    slides: {
      name: "Google Slides",
      scope: "https://www.googleapis.com/auth/presentations",
      description: "Access, view and edit your presentations",
      color: "#F4B400", // Slides yellow
      icon: "slides"
    },
    tasks: {
      name: "Google Tasks",
      scope: "https://www.googleapis.com/auth/tasks",
      description: "Access, view and manage your tasks",
      color: "#4285F4", // Tasks blue
      icon: "tasks"
    },
  } as const;
  
  export type ServiceKey = keyof typeof googleServices;
  
  // Additional Google brand colors for reference
  export const googleBrandColors = {
    blue: "#4285F4",
    red: "#DB4437",
    yellow: "#F4B400",
    green: "#0F9D58",
    lightBlue: "#00ACC1",
    purple: "#673AB7"
  };