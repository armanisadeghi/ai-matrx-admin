# Canvas Social Sharing System

A complete social sharing and gamification system for interactive canvas content like quizzes, flashcards, presentations, and more.

## 🎯 Features

### Core Functionality
- **Public Sharing**: Share canvas content with unique shareable links
- **Social Engagement**: Like, comment, and share counters
- **Leaderboards**: Competitive scoring for quizzes and games
- **Discovery**: Browse and search shared content
- **Analytics**: View counts, engagement metrics
- **Remixing**: Fork and modify existing content (with attribution)

### User Experience
- **No Auth Required**: Public viewing without login
- **Optional Auth**: Sign in for likes, scores, and creation
- **Real-time Stats**: Live engagement metrics
- **Responsive Design**: Works on all devices
- **Social Sharing**: One-click share to Twitter, Facebook, LinkedIn

## 📁 File Structure

```
components/canvas/
├── social/
│   ├── CanvasShareSheet.tsx        # Main sharing dialog
│   ├── CanvasSocialActions.tsx     # Like/share/stats buttons
│   ├── ScoreSubmissionDialog.tsx   # Score submission with confetti
│   ├── index.ts                    # Exports
│   └── README.md                   # This file
├── shared/
│   └── SharedCanvasView.tsx        # Public canvas viewer
├── discovery/
│   ├── CanvasDiscovery.tsx         # Browse/search canvases
│   └── CanvasCard.tsx              # Canvas preview card
└── leaderboard/
    └── CanvasLeaderboard.tsx       # Score rankings

hooks/canvas/
├── useCanvasShare.ts               # Create shares
├── useSharedCanvas.ts              # Load shared canvas
├── useCanvasLike.ts                # Like functionality
├── useCanvasScore.ts               # Submit scores
└── useLeaderboard.ts               # Fetch leaderboard

app/(public)/canvas/
├── shared/[token]/page.tsx         # View shared canvas
└── discover/page.tsx               # Discovery gallery
```

## 🚀 Quick Start

### 1. Sharing Canvas Content

The easiest way to share content is through the `CanvasRenderer`, which has built-in share functionality:

```tsx
import { CanvasRenderer } from '@/components/layout/adaptive-layout/CanvasRenderer';

// The share button is automatically available in the canvas header
<CanvasRenderer content={canvasContent} />
```

### 2. Manual Sharing

If you need more control:

```tsx
import { CanvasShareSheet } from '@/components/canvas/social';
import { useState } from 'react';

function MyComponent() {
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsShareOpen(true)}>
        Share
      </Button>

      <CanvasShareSheet
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        canvasData={myQuizData}
        canvasType="quiz"
        defaultTitle="My Awesome Quiz"
        hasScoring={true}
      />
    </>
  );
}
```

### 3. Viewing Shared Content

Shared canvases are automatically viewable at:
```
/canvas/shared/[share-token]
```

The `SharedCanvasView` component handles:
- Loading canvas data
- Tracking views
- Displaying social actions
- Rendering the content
- Showing leaderboard (if scored)

### 4. Adding Social Actions

Add like/share/stats buttons to any canvas:

```tsx
import { CanvasSocialActions } from '@/components/canvas/social';

<CanvasSocialActions
  canvasId={canvas.id}
  shareToken={canvas.share_token}
  likeCount={canvas.like_count}
  commentCount={canvas.comment_count}
  viewCount={canvas.view_count}
/>
```

### 5. Score Submission

For quizzes and games:

```tsx
import { ScoreSubmissionDialog } from '@/components/canvas/social';

<ScoreSubmissionDialog
  open={showResults}
  onOpenChange={setShowResults}
  canvasId={canvasId}
  score={userScore}
  maxScore={totalPossible}
  timeTaken={timeInMs}
  completed={true}
/>
```

## 🎨 Canvas Types

Supported canvas types for sharing:

| Type | Icon | Has Scoring | Description |
|------|------|-------------|-------------|
| `quiz` | 📝 | ✅ | Interactive quizzes |
| `flashcards` | 🗂️ | ✅ | Study flashcards |
| `presentation` | 📊 | ❌ | Slideshows |
| `diagram` | 📐 | ❌ | Interactive diagrams |
| `timeline` | 📅 | ❌ | Historical timelines |
| `research` | 🔬 | ❌ | Research content |
| `troubleshooting` | 🔧 | ❌ | Troubleshooting guides |
| `decision-tree` | 🌳 | ❌ | Decision trees |
| `resources` | 📚 | ❌ | Resource collections |
| `progress` | 📈 | ❌ | Progress trackers |
| `html` | 🌐 | ❌ | Custom HTML |
| `code` | 💻 | ❌ | Code snippets |

## 🔧 Hooks API

### useCanvasShare

Create and manage shareable links:

```tsx
const { share, shareUrl, isSharing, copyToClipboard } = useCanvasShare();

// Create a share
share({
  canvas_data: myData,
  title: "My Canvas",
  description: "Check this out!",
  canvas_type: "quiz",
  visibility: "public",
  allow_remixes: true,
  has_scoring: true
});

// Copy URL to clipboard
await copyToClipboard(shareUrl);
```

### useSharedCanvas

Load shared canvas data:

```tsx
const { data: canvas, isLoading, error } = useSharedCanvas(shareToken);

// Canvas data includes:
// - title, description, tags
// - canvas_data (the actual content)
// - creator info
// - engagement stats
// - sharing settings
```

### useCanvasLike

Handle likes:

```tsx
const { hasLiked, toggleLike, isLoading } = useCanvasLike(canvasId);

// User-friendly like toggle
<Button onClick={toggleLike} disabled={isLoading}>
  <Heart className={hasLiked ? "fill-current" : ""} />
</Button>
```

### useCanvasScore

Submit and track scores:

```tsx
const { submitScore, bestScore, isSubmitting } = useCanvasScore(canvasId);

// Submit a score
submitScore({
  score: 85,
  max_score: 100,
  time_taken: 45000, // milliseconds
  completed: true,
  data: { /* additional data */ }
});
```

### useLeaderboard

Fetch leaderboard rankings:

```tsx
const { data: leaderboard, isLoading } = useLeaderboard(canvasId, 10);

// Returns:
// - entries: array of top scores
// - userRank: current user's rank (if not in top N)
```

## 🎮 Gamification

The system includes built-in gamification:

### Score Submission
- Automatic rank calculation
- Personal best detection
- High score celebration (with confetti! 🎉)
- XP rewards

### XP Rewards
- Base XP: 5 points for participation
- Completion bonus: +10 points
- High score: +50 points
- Top 10: +25 points

### Visual Feedback
- Confetti animation for achievements
- Badge system for ranks
- Progress bars
- Performance levels (Outstanding, Great, Good, Keep Trying)

## 🔒 Privacy & Settings

### Visibility Options

- **Public**: Discoverable in gallery, anyone can view
- **Unlisted**: Only people with link can view
- **Private**: Only creator can view

### Remix Settings

- **Allow Remixes**: Let others fork your content
- **Require Attribution**: Remixes must credit you

## 🎯 Discovery Page

Browse shared content at `/canvas/discover`:

- **Search**: Find by title, description, or tags
- **Filter**: By canvas type
- **Sort Options**:
  - Trending (recent + high engagement)
  - Recent (newest first)
  - Popular (most liked)
  - Top Scored (highest scores)

## 📊 Analytics

Track engagement automatically:

- **Views**: Counted per unique session
- **Likes**: User-specific
- **Shares**: Social media share count
- **Play Count**: Number of attempts (scored content)
- **Engagement Rate**: Calculated percentage

## 🌐 Social Sharing

One-click sharing to:
- Twitter
- Facebook
- LinkedIn
- Copy link

## 🚧 Future Enhancements

Planned features:
- Comments system
- User profiles
- Collections/playlists
- Achievements system
- Verified creators
- Canvas analytics dashboard
- Email/embed sharing
- Custom branding

## 💡 Best Practices

### Creating Shareable Content

1. **Write clear titles**: Help people understand what they'll experience
2. **Add descriptions**: Provide context and instructions
3. **Use tags**: Improve discoverability
4. **Test before sharing**: Ensure content works correctly
5. **Enable remixes**: Foster community creativity
6. **Monitor engagement**: Check back to see how it performs

### For Quizzes & Games

1. **Set appropriate difficulty**: Keep it challenging but fair
2. **Provide feedback**: Help users learn
3. **Time limits**: Add urgency (optional)
4. **Varied questions**: Mix question types
5. **Score clearly**: Make scoring transparent

### Growing Your Audience

1. **Share on social media**: Use the built-in sharing buttons
2. **Create series**: Related content keeps people coming back
3. **Engage with remixes**: Appreciate derivative works
4. **Optimize for mobile**: Most users are on phones
5. **Update popular content**: Keep it fresh

## 🤝 Integration Examples

### With AI Cockpit

The AI Cockpit automatically integrates sharing:

```tsx
// Canvas panel has share button built-in
// Just push content to canvas and share!
```

### With Custom Components

```tsx
import { useCanvasShare } from '@/hooks/canvas/useCanvasShare';

function MyQuizComponent() {
  const { share } = useCanvasShare();
  
  const handleFinish = (results) => {
    // Share results automatically
    share({
      canvas_data: results,
      title: "Quiz Results",
      canvas_type: "quiz",
      has_scoring: true
    });
  };
}
```

## 📝 License

Part of the AI Matrix project.

## 🙋 Support

For questions or issues, please refer to the main project documentation.

