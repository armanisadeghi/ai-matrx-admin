# Prompt Apps Feature
## Turn AI Prompts into Public Shareable Web Apps

---

## 🎯 What Is This?

**Prompt Apps** allow users to create custom UI interfaces for their prompts and publish them as public web applications. Each app gets a unique URL (`aimatrx.com/p/{slug}`) that anyone can visit and use without creating an account.

### Key Benefits

1. **Marketing & Growth** - Free public apps advertise AI Matrx platform
2. **User Acquisition** - Anonymous users hit rate limits → sign up
3. **Creator Tools** - Users can share their prompts as polished apps
4. **Monetization** - Premium features, higher limits, custom domains

---

## 📁 File Structure

```
features/prompt-apps/
├── README.md                          # This file
├── AI_UI_BUILDER_GUIDELINES.md        # Instructions for AI to build UIs
├── types/
│   └── index.ts                       # TypeScript definitions
├── components/
│   └── PromptAppRenderer.tsx          # Dynamic component renderer
└── services/
    └── (to be created)

app/api/public/apps/[slug]/execute/
└── route.ts                           # Public execution API

app/(public)/p/[slug]/
└── page.tsx                           # Public app page

supabase/migrations/
└── create_prompt_apps_system.sql      # Database schema
```

---

## 🚀 Quick Start

### 1. Set Up Database

Run the migration in Supabase:

```bash
# Copy contents of supabase/migrations/create_prompt_apps_system.sql
# Paste into Supabase SQL Editor
# Execute
```

This creates:
- `prompt_apps` table
- `prompt_app_executions` table
- `prompt_app_errors` table
- `prompt_app_rate_limits` table
- `prompt_app_categories` table
- `prompt_app_analytics` view
- Helper functions and triggers

### 2. Install Dependencies

```bash
# Already in package.json (should be):
# - @babel/standalone (for JSX transformation)
# - uuid (for task IDs)
# - Socket.IO client (existing)
```

### 3. Test the System

Create a test app:

```typescript
// In your app builder interface
const testApp = {
  prompt_id: 'your-prompt-uuid',
  slug: 'test-app',
  name: 'Test App',
  component_code: `
    export default function TestApp({ onExecute, response }) {
      const [text, setText] = useState('');
      return (
        <div className="p-6">
          <input value={text} onChange={e => setText(e.target.value)} />
          <button onClick={() => onExecute({ text })}>Run</button>
          {response && <div>{response}</div>}
        </div>
      );
    }
  `,
  variable_schema: [{ name: 'text', type: 'string', required: true }],
  allowed_imports: ['react', 'lucide-react'],
  status: 'published'
};
```

Visit: `http://localhost:3000/p/test-app`

---

## 📋 Implementation Checklist

### Phase 1: Core System ✅
- [x] Database schema
- [x] TypeScript types
- [x] Public API endpoint
- [x] Component renderer
- [x] Rate limiting logic
- [x] Error tracking
- [x] AI builder guidelines

### Phase 2: User Interface (Next)
- [ ] App builder page (`/apps/new`)
- [ ] AI UI generator integration
- [ ] App management dashboard
- [ ] Analytics page for creators
- [ ] App gallery/browse page

### Phase 3: Enhanced Features
- [ ] Template library
- [ ] Component preview in builder
- [ ] Custom domains
- [ ] Embed widgets
- [ ] A/B testing
- [ ] White-label options

### Phase 4: Monetization
- [ ] Premium tier (higher limits)
- [ ] Pay-per-execution
- [ ] Revenue sharing
- [ ] App analytics APIs

---

## 🔑 Key Concepts

### Execution Flow

1. **User visits public app** → `aimatrx.com/p/story-generator`
2. **Custom UI renders** → React component from database
3. **User fills form** → Variables collected
4. **Clicks "Generate"** → `onExecute(variables)` called
5. **API checks rate limit** → Fingerprint/IP tracking
6. **API fetches prompt** → Private, server-side only
7. **Variables resolved** → `{{variable}}` → actual values
8. **Chat config built** → Model, messages, settings
9. **Task ID returned** → Client uses for Socket.IO
10. **Client submits** → Redux + Socket.IO
11. **Backend streams** → Real-time response
12. **UI updates** → Shows streaming text

### Rate Limiting

**Anonymous Users** (no account):
- 5 executions per 24 hours (per IP/fingerprint)
- After 3 uses, show signup banner
- After 5 uses, require account

**Authenticated Users**:
- 100 executions per 24 hours (base)
- Can upgrade for unlimited
- Premium features unlocked

### Security

**Component Sandboxing**:
- Babel transforms JSX → JavaScript
- `new Function()` creates isolated scope
- Only allowlisted imports available
- No network access (except via `onExecute`)

**Prompt Privacy**:
- Prompt ID and content never exposed
- Only app creator can see prompt
- Public only sees variable schema

---

## 📖 Documentation

- **Main Documentation**: `/app/(authenticated)/ai/prompts/PROMPT_APPS_SYSTEM.md`
- **AI Guidelines**: `/features/prompt-apps/AI_UI_BUILDER_GUIDELINES.md`
- **TypeScript Types**: `/features/prompt-apps/types/index.ts`
- **Database Schema**: `/supabase/migrations/create_prompt_apps_system.sql`

---

## 🎨 Example Apps

### Simple Text Generator

```typescript
export default function SimpleGenerator({ onExecute, response, isExecuting }) {
  const [topic, setTopic] = useState('');
  
  return (
    <div className="p-6">
      <Input 
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter topic"
      />
      <Button onClick={() => onExecute({ topic })} disabled={!topic || isExecuting}>
        Generate
      </Button>
      {response && <div>{response}</div>}
    </div>
  );
}
```

### Multi-Step Form

```typescript
export default function MultiStep({ onExecute, response }) {
  const [step, setStep] = useState(1);
  const [variables, setVariables] = useState({ name: '', topic: '', style: '' });
  
  return (
    <div className="p-6">
      {step === 1 && (
        <>
          <Input value={variables.name} onChange={e => setVariables({...variables, name: e.target.value})} />
          <Button onClick={() => setStep(2)}>Next</Button>
        </>
      )}
      {step === 2 && (
        <>
          <Input value={variables.topic} onChange={e => setVariables({...variables, topic: e.target.value})} />
          <Button onClick={() => setStep(1)}>Back</Button>
          <Button onClick={() => setStep(3)}>Next</Button>
        </>
      )}
      {step === 3 && (
        <>
          <Select value={variables.style} onValueChange={v => setVariables({...variables, style: v})}>
            <SelectItem value="casual">Casual</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
          </Select>
          <Button onClick={() => onExecute(variables)}>Generate</Button>
        </>
      )}
      {response && <div>{response}</div>}
    </div>
  );
}
```

---

## 🔧 API Reference

### POST `/api/public/apps/{slug}/execute`

Execute prompt app (public, rate limited)

**Request:**
```json
{
  "variables": { "topic": "AI", "style": "professional" },
  "fingerprint": "base64_string",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "task_id": "uuid",
  "chat_config": { "model_id": "gpt-4", "messages": [...] },
  "rate_limit": { "allowed": true, "remaining": 4 }
}
```

### GET `/api/public/apps/{slug}`

Get app metadata (public)

**Response:**
```json
{
  "id": "uuid",
  "slug": "story-generator",
  "name": "Story Generator",
  "variable_schema": [...],
  "total_executions": 1234
}
```

---

## 🐛 Common Issues

### Issue: Component won't render

**Cause**: Invalid JSX or forbidden imports

**Fix**: Check AI guidelines, ensure only allowed imports used

### Issue: Rate limit not working

**Cause**: Fingerprint not generated or rate_limit function failed

**Fix**: Check browser console, verify PostgreSQL function exists

### Issue: Streaming not working

**Cause**: Task ID mismatch or Socket.IO not connected

**Fix**: Verify task ID passed correctly to `createAndSubmitTask`

### Issue: Variables not resolving

**Cause**: Variable name mismatch or missing in schema

**Fix**: Ensure variable names match exactly between UI and schema

---

## 📊 Metrics to Track

- **Total Apps Created**
- **Total Executions** (anonymous + authenticated)
- **Conversion Rate** (anonymous → signup)
- **Average Executions per App**
- **Top Performing Apps**
- **Cost per Execution**
- **Error Rate by App**
- **User Retention** (return visitors)

---

## 🚦 Status

**Current Phase**: Phase 1 Complete ✅

**Ready for**:
- Testing database migration
- Building app creation interface
- Integrating AI UI generator
- First public app deployment

**Next Steps**:
1. Run database migration
2. Create app builder UI
3. Test end-to-end flow
4. Deploy first example apps
5. Monitor usage and iterate

---

## 💡 Future Ideas

- **Component Marketplace** - Sell premium UI templates
- **Embed Widgets** - `<iframe>` embed for any website
- **Custom Domains** - `yourdomain.com` instead of `aimatrx.com/p/slug`
- **A/B Testing** - Test different UIs for same prompt
- **Analytics API** - Let creators integrate with their tools
- **White-Label** - Remove AI Matrx branding (premium)
- **Collaborative Editing** - Multiple users building one app
- **Version Control** - Git-like branching for apps

---

## 📞 Support

For questions or issues:
- Check documentation in `/app/(authenticated)/ai/prompts/`
- Review AI guidelines in `AI_UI_BUILDER_GUIDELINES.md`
- Test with simple example first
- Monitor database triggers and functions

---

**This is our killer feature. Let's make it amazing!** 🚀

