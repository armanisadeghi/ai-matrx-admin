'use client';

import SmallCodeEditor from '@/features/code-editor/components/code-block/SmallCodeEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SAMPLE_JS = `// JavaScript with IntelliSense
function calculateFactorial(n) {
  if (n <= 1) return 1;
  return n * calculateFactorial(n - 1);
}

// Try typing: console.
// You should see IntelliSense suggestions!
console.log('Factorial of 5:', calculateFactorial(5));

// Try typing: document.
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded!');
});`;

const SAMPLE_TS = `// TypeScript with full IntelliSense
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUserById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}

// Try typing and see type hints!
const service = new UserService();
const user: User = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin'
};

service.addUser(user);`;

const SAMPLE_JSON = `{
  "name": "monaco-test",
  "version": "1.0.0",
  "description": "Testing Monaco syntax highlighting",
  "dependencies": {
    "react": "^19.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}`;

const SAMPLE_CSS = `/* CSS with syntax highlighting */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}`;

const SAMPLE_PYTHON = `# Python with syntax highlighting
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    sequence = []
    a, b = 0, 1
    
    for _ in range(n):
        sequence.append(a)
        a, b = b, a + b
    
    return sequence

# Calculate and print Fibonacci numbers
result = fibonacci(10)
print(f"Fibonacci sequence: {result}")

class Calculator:
    @staticmethod
    def add(a, b):
        return a + b
    
    @staticmethod
    def multiply(a, b):
        return a * b`;

export default function MonacoTestPage() {
  const [jsCode, setJsCode] = useState(SAMPLE_JS);
  const [tsCode, setTsCode] = useState(SAMPLE_TS);
  const [jsonCode, setJsonCode] = useState(SAMPLE_JSON);
  const [cssCode, setCssCode] = useState(SAMPLE_CSS);
  const [pythonCode, setPythonCode] = useState(SAMPLE_PYTHON);

  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-y-auto pb-safe">
        <div className="container mx-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monaco Editor - Syntax Highlighting Test</CardTitle>
              <CardDescription>
                Test syntax highlighting and IntelliSense across different languages.
                Try typing to see IntelliSense suggestions (e.g., "console." or "document.").
                Monaco config is lazy-loaded only when you interact with an editor!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="javascript" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="css">CSS</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>

                <TabsContent value="javascript" className="mt-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">JavaScript Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Should show syntax highlighting and IntelliSense for JS APIs
                    </p>
                    <SmallCodeEditor
                      language="javascript"
                      initialCode={jsCode}
                      onChange={setJsCode}
                      height="500px"
                      showFormatButton={true}
                      showCopyButton={true}
                      showResetButton={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="typescript" className="mt-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">TypeScript Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Should show full TypeScript IntelliSense with type checking
                    </p>
                    <SmallCodeEditor
                      language="typescript"
                      initialCode={tsCode}
                      onChange={setTsCode}
                      height="500px"
                      showFormatButton={true}
                      showCopyButton={true}
                      showResetButton={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="json" className="mt-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">JSON Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Should show JSON syntax highlighting and validation
                    </p>
                    <SmallCodeEditor
                      language="json"
                      initialCode={jsonCode}
                      onChange={setJsonCode}
                      height="500px"
                      showFormatButton={true}
                      showCopyButton={true}
                      showResetButton={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="css" className="mt-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">CSS Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Should show CSS syntax highlighting and property suggestions
                    </p>
                    <SmallCodeEditor
                      language="css"
                      initialCode={cssCode}
                      onChange={setCssCode}
                      height="500px"
                      showFormatButton={true}
                      showCopyButton={true}
                      showResetButton={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="python" className="mt-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Python Editor</h3>
                    <p className="text-sm text-muted-foreground">
                      Should show Python syntax highlighting (basic colorization)
                    </p>
                    <SmallCodeEditor
                      language="python"
                      initialCode={pythonCode}
                      onChange={setPythonCode}
                      height="500px"
                      showFormatButton={true}
                      showCopyButton={true}
                      showResetButton={true}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-lg">What to Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">✅ Syntax Highlighting</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Keywords should be colored (function, const, let, if, etc.)</li>
                  <li>Strings should be colored</li>
                  <li>Comments should be colored (different from code)</li>
                  <li>Numbers should be colored</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ IntelliSense (JS/TS)</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Type "console." and you should see method suggestions</li>
                  <li>Type "document." and you should see DOM API suggestions</li>
                  <li>For TypeScript: you should see type information on hover</li>
                  <li>Parameter hints should appear when calling functions</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">✅ Code Validation</h4>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Syntax errors should be underlined in red</li>
                  <li>JSON: Invalid JSON should show errors</li>
                  <li>TypeScript: Type errors should be highlighted</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

