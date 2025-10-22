# Component Implementation Guide
## Building the Social Canvas System - Component by Component

---

## 📁 File Structure

```
components/canvas/
├── social/
│   ├── CanvasShareSheet.tsx          # Share modal with URL generation
│   ├── CanvasSocialActions.tsx       # Like, share, comment buttons
│   ├── CanvasComments.tsx            # Comments section
│   ├── CanvasLikeButton.tsx         # Like button with animation
│   └── ShareButton.tsx               # Social media share
│
├── discovery/
│   ├── CanvasDiscoverPage.tsx       # Main discovery page
│   ├── CanvasGallery.tsx            # Grid of canvas cards
│   ├── CanvasCard.tsx               # Individual canvas card
│   ├── TrendingSection.tsx          # Trending canvases
│   └── DiscoveryFilters.tsx         # Filter sidebar
│
├── leaderboard/
│   ├── CanvasLeaderboard.tsx        # Leaderboard component
│   ├── LeaderboardRow.tsx           # Individual rank row
│   └── LeaderboardFilters.tsx       # Time/friend filters
│
├── versioning/
│   ├── ForkTreeView.tsx             # Version tree visualization
│   ├── ForkButton.tsx               # Fork/remix button
│   ├── VersionHistory.tsx           # Version list
│   └── AttributionChain.tsx         # Credit chain display
│
├── profile/
│   ├── CreatorProfilePage.tsx       # User profile page
│   ├── UserStatsCard.tsx            # Stats display
│   ├── AchievementBadges.tsx        # Achievement display
│   └── CreatorGallery.tsx           # User's creations
│
├── feed/
│   ├── CanvasFeed.tsx               # Main feed component
│   ├── FeedCard.tsx                 # Feed item card
│   ├── FeedFilters.tsx              # Following/Discover tabs
│   └── ActivityFeed.tsx             # Social activity
│
├── gamification/
│   ├── XPBar.tsx                    # XP/Level display
│   ├── AchievementToast.tsx         # Achievement unlock
│   ├── StreakDisplay.tsx            # Streak counter
│   └── LevelUpAnimation.tsx         # Level up effect
│
├── shared/
│   ├── SharedCanvasPage.tsx         # Public canvas viewer
│   ├── CanvasPlayer.tsx             # Interactive player
│   └── CanvasMetadata.tsx           # Canvas info display
│
└── hooks/
    ├── useCanvasShare.ts            # Share functionality
    ├── useCanvasLike.ts             # Like functionality
    ├── useCanvasScore.ts            # Score submission
    ├── useLeaderboard.ts            # Leaderboard data
    ├── useTrending.ts               # Trending algorithm
    ├── useUserStats.ts              # User statistics
    └── useForkCanvas.ts             # Fork functionality
```

---

## 🎯 Component Specifications

### 1. CanvasShareSheet

**Purpose**: Modal for sharing canvas content with unique URL

**Props**:
```typescript
interface CanvasShareSheetProps {
    canvas: CanvasContent; // Current canvas data
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onShared?: (shareToken: string) => void;
}
```

**Features**:
- Generate unique share token
- Copy shareable URL
- Social media share buttons (Twitter, Facebook, LinkedIn)
- QR code generation
- Embed code
- Settings: visibility, allow remixes, attribution
- View share analytics

**State**:
```typescript
const [shareToken, setShareToken] = useState<string>('');
const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
const [allowRemixes, setAllowRemixes] = useState(true);
const [requireAttribution, setRequireAttribution] = useState(true);
const [isGenerating, setIsGenerating] = useState(false);
const [copied, setCopied] = useState(false);
```

---

### 2. CanvasSocialActions

**Purpose**: Action bar with social buttons

**Props**:
```typescript
interface CanvasSocialActionsProps {
    canvasId: string;
    initialLikes?: number;
    initialLiked?: boolean;
    onLike?: () => void;
    onShare?: () => void;
    onComment?: () => void;
    onFork?: () => void;
}
```

**Features**:
- ❤️ Like button with heart animation
- 💬 Comment count and button
- 🔄 Share button
- 🍴 Fork button
- 🔖 Bookmark button
- 📊 Stats popover

**Interactions**:
- Optimistic updates
- Animation feedback
- Toast notifications
- Auth check before actions

---

### 3. CanvasDiscoverPage

**Purpose**: Main discovery/gallery page

**Route**: `/canvas/discover`

**Layout**:
```
┌─────────────────────────────────────────┐
│           Discover Canvas               │
├──────────┬──────────────────────────────┤
│          │  🔥 Trending                 │
│ Filters  │  [Grid of canvas cards]      │
│ Sidebar  │                              │
│          │  📅 New This Week            │
│          │  [Grid of canvas cards]      │
│          │                              │
│          │  🏆 Top Rated                │
│          │  [Grid of canvas cards]      │
└──────────┴──────────────────────────────┘
```

**Features**:
- Hero section with featured content
- Trending algorithm-based feed
- Category filters
- Search functionality
- Infinite scroll
- Load more sections
- Empty states

---

### 4. SharedCanvasPage

**Purpose**: Public viewer for shared canvases

**Route**: `/canvas/shared/[token]`

**Layout**:
```
┌─────────────────────────────────────────┐
│  Canvas Player (Full Interactive)      │
├─────────────────────────────────────────┤
│  ❤️ 234  💬 45  🔄 Share  🍴 Fork     │
├──────────────────┬──────────────────────┤
│                  │                      │
│  Canvas Info     │  📊 Leaderboard     │
│  👤 Creator      │  (if scored)        │
│  📈 Stats        │                      │
│  🏷️ Tags         │                      │
│                  │                      │
├──────────────────┴──────────────────────┤
│  💬 Comments Section                    │
│  [Comment threads]                      │
└─────────────────────────────────────────┘
```

**Features**:
- SEO meta tags
- Open Graph tags
- View tracking
- Engagement tracking
- Related content suggestions
- Fork tree link
- Creator profile link

---

### 5. CanvasLeaderboard

**Purpose**: Display high scores for scored content

**Props**:
```typescript
interface CanvasLeaderboardProps {
    canvasId: string;
    variant?: 'compact' | 'full';
    limit?: number;
    showFilters?: boolean;
}
```

**Features**:
- Top 10/25/50/100 scores
- User rank highlight
- Time filters (all-time, weekly, daily)
- Friends-only filter
- Pagination
- Real-time updates
- Avatar display
- Score breakdown

**Columns**:
- Rank (with medals for top 3)
- Username (with avatar)
- Score
- Time taken
- Date achieved

---

### 6. ForkTreeView

**Purpose**: Visualize version history and forks

**Props**:
```typescript
interface ForkTreeViewProps {
    canvasId: string;
    originalId?: string;
    onNodeClick?: (nodeId: string) => void;
}
```

**Features**:
- Tree/graph visualization
- Highlight improvements
- Show fork stats
- Navigate between versions
- Compare versions
- Attribution chain
- Interactive nodes

**Visualization**:
```
        [Original]
        /    |    \
   [Fork1] [Fork2] [Fork3]
     /  \
  [F1.1] [F1.2]
```

---

### 7. CreatorProfilePage

**Purpose**: Public profile for content creators

**Route**: `/canvas/creator/[username]`

**Sections**:
1. **Profile Header**
   - Avatar
   - Display name
   - Bio
   - Social links
   - Follow button
   - Stats overview

2. **Stats Grid**
   - Total creations
   - Total likes
   - Total views
   - Total forks

3. **Achievement Badges**
   - Unlocked achievements
   - Progress bars

4. **Content Grid**
   - User's creations
   - Tabs: Public, Liked, Forked

5. **Activity Graph**
   - Creation timeline
   - Engagement over time

---

### 8. CanvasFeed

**Purpose**: Personalized feed of canvas content

**Tabs**:
- 🏠 Following (creators you follow)
- 🔥 Trending (algorithm-based)
- 🎲 Discover (random/new)
- 🏆 Top (highest rated)

**Features**:
- Infinite scroll
- Pull to refresh
- Quick play
- Inline like/share
- Skeleton loading
- Empty states

---

### 9. XPBar & Gamification

**XPBar Component**:
```typescript
interface XPBarProps {
    currentXP: number;
    nextLevelXP: number;
    level: number;
    animated?: boolean;
}
```

**Features**:
- Progress bar
- Level display
- XP count
- Next level indicator
- Fill animation
- Level up celebration

**Achievement Toast**:
- Slide-in animation
- Badge icon
- Achievement name
- XP reward
- Celebration confetti

---

## 🎨 Design Patterns

### Optimistic Updates

```typescript
const { mutate } = useMutation({
    mutationFn: likeCanvas,
    onMutate: async (canvasId) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['canvas', canvasId]);
        
        // Snapshot previous value
        const previous = queryClient.getQueryData(['canvas', canvasId]);
        
        // Optimistically update
        queryClient.setQueryData(['canvas', canvasId], (old: any) => ({
            ...old,
            like_count: old.like_count + 1,
            user_has_liked: true
        }));
        
        return { previous };
    },
    onError: (err, variables, context) => {
        // Rollback on error
        if (context?.previous) {
            queryClient.setQueryData(['canvas', variables], context.previous);
        }
    },
    onSettled: () => {
        // Refetch after success or error
        queryClient.invalidateQueries(['canvas']);
    }
});
```

### Infinite Scroll Pattern

```typescript
const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
} = useInfiniteQuery({
    queryKey: ['canvases', 'trending'],
    queryFn: ({ pageParam = 0 }) => fetchTrendingCanvases(pageParam),
    getNextPageParam: (lastPage, pages) => lastPage.nextCursor
});

// With Intersection Observer
const { ref } = useInView({
    onChange: (inView) => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }
});
```

### Real-time Updates (Supabase)

```typescript
useEffect(() => {
    const channel = supabase
        .channel('canvas-updates')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'shared_canvas_items',
                filter: `id=eq.${canvasId}`
            },
            (payload) => {
                // Update local state
                queryClient.setQueryData(['canvas', canvasId], payload.new);
            }
        )
        .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    };
}, [canvasId]);
```

---

## 📊 API Endpoints (Supabase Edge Functions)

### 1. Share Canvas
```typescript
// POST /api/canvas/share
{
    canvasData: CanvasContent,
    title: string,
    description: string,
    visibility: 'public' | 'unlisted' | 'private',
    allowRemixes: boolean
}
// Returns: { shareToken: string, url: string }
```

### 2. Fork Canvas
```typescript
// POST /api/canvas/fork
{
    canvasId: string,
    modifications: object
}
// Returns: { newCanvasId: string, shareToken: string }
```

### 3. Submit Score
```typescript
// POST /api/canvas/score
{
    canvasId: string,
    score: number,
    maxScore: number,
    timeTaken: number,
    completed: boolean
}
// Returns: { rank: number, isHighScore: boolean, xpEarned: number }
```

### 4. Get Trending
```typescript
// GET /api/canvas/trending?limit=20&offset=0
// Returns: { canvases: Canvas[], nextCursor: number }
```

### 5. Get Leaderboard
```typescript
// GET /api/canvas/[id]/leaderboard?limit=10&timeframe=all
// Returns: { scores: Score[], userRank?: number }
```

---

## 🎯 Component Development Order

### Phase 1: Core (Week 1)
1. ✅ CanvasShareSheet
2. ✅ Database schema implementation
3. ✅ SharedCanvasPage (basic)
4. ✅ Share URL generation
5. ✅ View tracking

### Phase 2: Social (Week 2)
6. ✅ CanvasLikeButton
7. ✅ CanvasSocialActions
8. ✅ CanvasComments
9. ✅ User authentication flow

### Phase 3: Discovery (Week 3)
10. ✅ CanvasCard
11. ✅ CanvasGallery
12. ✅ CanvasDiscoverPage
13. ✅ Search & filters
14. ✅ Trending algorithm

### Phase 4: Gamification (Week 4)
15. ✅ CanvasLeaderboard
16. ✅ Score submission
17. ✅ XPBar
18. ✅ Achievement system

### Phase 5: Versioning (Week 5)
19. ✅ ForkButton
20. ✅ ForkTreeView
21. ✅ Version comparison
22. ✅ Attribution chain

### Phase 6: Profiles & Feed (Week 6)
23. ✅ CreatorProfilePage
24. ✅ CanvasFeed
25. ✅ Follow system
26. ✅ Activity feed

---

## 🧪 Testing Strategy

### Unit Tests
- Individual component rendering
- Hook functionality
- Utility functions
- State management

### Integration Tests
- User flows (create → share → view)
- Social interactions
- Fork workflow
- Score submission

### E2E Tests
- Full user journey
- Multi-user scenarios
- Real-time updates
- Performance testing

---

Let's build this! 🚀

