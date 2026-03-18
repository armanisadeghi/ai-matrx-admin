# **Arman's Profile & Context**

## **Work Context**

Arman is the founder and lead developer of **AI Matrx**, a comprehensive multi-app AI ecosystem. His architecture is centered around a core Python server (**AI Dream**) and a primary Next.js/React/TypeScript frontend (**Matrx Admin**). He manages a sophisticated polyrepo and monorepo environment, including **Matrx Ship**, a large-scale monorepo designed for rapid application deployment. His leadership involves coordinating specialized teams to maintain a full-stack environment spanning web, mobile, desktop, and browser/IDE extensions.

## **Core Architecture & Suite**

### **The AI Matrx Suite**

* **AI Dream**: The primary Python server handling all "real" server-side logic and AI processing. Hosted on **Coolify**.  
* **Matrx Admin**: The main Next.js/React/TS frontend. While it has its own server for rendering, core logic is delegated to AI Dream. Hosted on **Vercel**.  
* **Matrx Local**: A cross-platform desktop application (macOS, Windows, Linux) featuring a **Python backend** and a **React Vite UI**. It serves as an optional supporting addon for the ecosystem.  
* **Matrx Code**: A specialized **VS Code extension** designed for AI-integrated development.  
* **Matrx Chrome**: An optional supporting Chrome extension.  
* **Matrx Mobile**: A cross-platform mobile app built with Expo and React Native, featuring native iOS and Android UI.

### **Supporting Python Packages**

* **Matrx ORM**: A custom-built, fully asynchronous ORM designed for high-performance database interactions.  
* **Matrx UTILS**: A shared set of utilities used across the entire application suite.  
* **Matrx AI**: The AI logic extracted from AI Dream into a standalone package for modular integration.  
* **Matrx Flow**: The workflow engine portion of AI Dream, extracted as a standalone package.  
* **Matrx Ship**: A massive monorepo containing Python, multiple Next.js projects, and tools for launching full apps in minutes.

## **Technical Stack & Ideology**

* **Ideology**: Arman has a strict preference for the **latest versions** of all technologies and packages. He avoids outdated stacks and prioritizes cutting-edge tools unless there is a definitive, absolute reason to remain on an older version.  
* **Database**: Primary architecture built on **Supabase** and **Supabase Auth**.  
* **Storage**: **AWS S3** buckets for file and asset storage.  
* **Secondary DBs**: Additional PostgreSQL instances for specialized tasks outside the Supabase environment.  
* **Authentication**: Utilizes a custom **Supabase OAuth server** to provide seamless SSO across the AI Matrx ecosystem.  
* **Infrastructure**: Uses **Coolify** for self-hosted Python application hosting and **Vercel** for Next.js deployments.

## **Personal Context & Background**

Arman is a father of two teenage girls and he spends nearly all of his time either working tirelessly on his AI Project or being a great Father. Arman’s absolute biggest passion in life is **Artificial Intelligence**. For the last 3 years, he has dedicated his work entirely to realizing the potential of AI. **AI Matrx** and **AI Dream** are the primary vehicles he is building to unleash the power of what he believes AI can achieve for the world. He is highly technical with deep expertise across full-stack development, database architecture, and system design.

## **Top of Mind**

Arman is currently focused on the modularization of the AI Matrx ecosystem—extracting core features like AI and Flow into standalone packages. He is also refining **Matrx Ship** to optimize the "launch in minutes" workflow. A key technical focus is the **Python-to-React structured data streaming system** (the "constitution") to ensure consistent rendering contracts across his multi-platform suite.

## **Brief History**

### **Recent Months**

Arman has been refining the **Supabase multi-project architecture**, implementing cross-project OAuth/JWT authentication. He built the **Matrx Flow** workflow engine and has been developing the **Matrx Local** app (Python/Vite), exploring local LLM inference and Whisper transcription on Apple Silicon.

### **Earlier Context**

Work included a significant migration from Socket.io to **FastAPI** for prompt/agent functionality. He designed a conversation storage system with a cx\_ prefix schema supporting message condensation and forking. He developed a **Unified LLM config system** supporting OpenAI, Anthropic, and Google Gemini with token usage normalization.

## **Other Instructions**

The platform is called "**AI Matrx**" — never "AI Matrix" (there is no "i" in Matrx).