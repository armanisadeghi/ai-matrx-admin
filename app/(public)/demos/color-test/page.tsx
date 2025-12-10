'use client';

export default function ColorTestPage() {
  return (
    <div className="min-h-dvh bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tailwind 4 Color & Interaction Test</h1>
          <p className="text-muted-foreground">Comprehensive test for colors, hover states, and interactions</p>
        </div>

        {/* Background Colors - Direct */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Background Colors (Direct)</h2>
          <div className="grid grid-cols-6 gap-4">
            <div className="p-4 bg-background border rounded-lg">
              <div className="text-xs font-mono mb-1">bg-background</div>
              <div className="text-xs text-muted-foreground">Should be zinc-100/850</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-xs font-mono mb-1">bg-card</div>
              <div className="text-xs text-muted-foreground">Should be white/zinc-800</div>
            </div>
            <div className="p-4 bg-muted border rounded-lg">
              <div className="text-xs font-mono mb-1">bg-muted</div>
              <div className="text-xs text-muted-foreground">Should be zinc-200/750</div>
            </div>
            <div className="p-4 bg-accent border rounded-lg">
              <div className="text-xs font-mono mb-1">bg-accent</div>
              <div className="text-xs">Should be subtle</div>
            </div>
            <div className="p-4 bg-primary text-primary-foreground rounded-lg">
              <div className="text-xs font-mono mb-1">bg-primary</div>
              <div className="text-xs">Should be blue</div>
            </div>
            <div className="p-4 bg-secondary text-secondary-foreground rounded-lg">
              <div className="text-xs font-mono mb-1">bg-secondary</div>
              <div className="text-xs">Should be purple</div>
            </div>
          </div>
        </section>

        {/* Background Colors - Hover States */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Background Colors (Hover States)</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-card hover:bg-accent border rounded-lg transition-colors cursor-pointer">
              <div className="text-xs font-mono mb-1">hover:bg-accent</div>
              <div className="text-xs text-muted-foreground">card → accent</div>
            </div>
            <div className="p-4 bg-card hover:bg-muted border rounded-lg transition-colors cursor-pointer">
              <div className="text-xs font-mono mb-1">hover:bg-muted</div>
              <div className="text-xs text-muted-foreground">card → muted</div>
            </div>
            <div className="p-4 bg-muted hover:bg-card border rounded-lg transition-colors cursor-pointer">
              <div className="text-xs font-mono mb-1">hover:bg-card</div>
              <div className="text-xs text-muted-foreground">muted → card</div>
            </div>
            <div className="p-4 bg-background hover:bg-accent border rounded-lg transition-colors cursor-pointer">
              <div className="text-xs font-mono mb-1">hover:bg-accent</div>
              <div className="text-xs text-muted-foreground">background → accent</div>
            </div>
          </div>
        </section>

        {/* Text Colors - Direct */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Text Colors (Direct)</h2>
          <div className="grid grid-cols-6 gap-4">
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-foreground text-sm font-mono mb-1">text-foreground</div>
              <div className="text-xs text-muted-foreground">Main text color</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-muted-foreground text-sm font-mono mb-1">text-muted-foreground</div>
              <div className="text-xs text-muted-foreground">Muted text</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-primary text-sm font-mono mb-1">text-primary</div>
              <div className="text-xs text-muted-foreground">Should be blue</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-secondary text-sm font-mono mb-1">text-secondary</div>
              <div className="text-xs text-muted-foreground">Should be purple</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-destructive text-sm font-mono mb-1">text-destructive</div>
              <div className="text-xs text-muted-foreground">Should be red</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-success text-sm font-mono mb-1">text-success</div>
              <div className="text-xs text-muted-foreground">Should be green</div>
            </div>
          </div>
        </section>

        {/* Text Colors - Hover States */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Text Colors (Hover States)</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-foreground hover:text-primary text-sm font-mono cursor-pointer transition-colors">
                hover:text-primary
              </div>
              <div className="text-xs text-muted-foreground">foreground → primary</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-foreground hover:text-secondary text-sm font-mono cursor-pointer transition-colors">
                hover:text-secondary
              </div>
              <div className="text-xs text-muted-foreground">foreground → secondary</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-foreground hover:text-muted-foreground text-sm font-mono cursor-pointer transition-colors">
                hover:text-muted-foreground
              </div>
              <div className="text-xs text-muted-foreground">foreground → muted</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-muted-foreground hover:text-foreground text-sm font-mono cursor-pointer transition-colors">
                hover:text-foreground
              </div>
              <div className="text-xs text-muted-foreground">muted → foreground</div>
            </div>
          </div>
        </section>

        {/* Border Colors */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Border Colors (Direct & Hover)</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-card border-2 border-border rounded-lg">
              <div className="text-xs font-mono mb-1">border-border</div>
              <div className="text-xs text-muted-foreground">Default border</div>
            </div>
            <div className="p-4 bg-card border-2 border-input rounded-lg">
              <div className="text-xs font-mono mb-1">border-input</div>
              <div className="text-xs text-muted-foreground">Input border</div>
            </div>
            <div className="p-4 bg-card border-2 border-primary rounded-lg">
              <div className="text-xs font-mono mb-1">border-primary</div>
              <div className="text-xs text-muted-foreground">Primary border</div>
            </div>
            <div className="p-4 bg-card border-2 border-border hover:border-primary rounded-lg transition-colors cursor-pointer">
              <div className="text-xs font-mono mb-1">hover:border-primary</div>
              <div className="text-xs text-muted-foreground">border → primary</div>
            </div>
          </div>
        </section>

        {/* Focus & Ring States */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Focus & Ring States</h2>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="focus:ring-2 focus:ring-ring"
              className="px-4 py-2 bg-card border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            />
            <input
              type="text"
              placeholder="focus:ring-2 focus:ring-primary"
              className="px-4 py-2 bg-card border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            />
            <input
              type="text"
              placeholder="focus:border-primary"
              className="px-4 py-2 bg-card border border-input rounded-lg focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </section>

        {/* Button-like Elements (Menu Items) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Interactive Elements (Menu/Button Style)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="text-sm font-semibold mb-2">Standard Menu Item Pattern</div>
              <div className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                hover:bg-accent + hover:text-accent-foreground
              </div>
              <div className="px-3 py-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                hover:bg-muted
              </div>
              <div className="px-3 py-2 rounded-md hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors">
                hover:bg-primary + hover:text-primary-foreground
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 space-y-2">
              <div className="text-sm font-semibold mb-2">Active/Selected States</div>
              <div className="px-3 py-2 rounded-md bg-accent text-accent-foreground">
                bg-accent + text-accent-foreground (active)
              </div>
              <div className="px-3 py-2 rounded-md bg-primary text-primary-foreground">
                bg-primary + text-primary-foreground (active)
              </div>
              <div className="px-3 py-2 rounded-md bg-muted">
                bg-muted (active)
              </div>
            </div>
          </div>
        </section>

        {/* Complex Hover Combinations */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Complex Hover Combinations</h2>
          <div className="grid grid-cols-3 gap-4">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Primary Button (opacity hover)
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Secondary Button (opacity hover)
            </button>
            <button className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors">
              Outlined Button (bg+text hover)
            </button>
          </div>
        </section>

        {/* Custom Hover Variables Test */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Custom Hover Variables (CSS)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div 
              className="p-4 rounded-lg cursor-pointer transition-colors"
              style={{
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--primary-hover))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--primary))'}
            >
              <div className="text-xs font-mono">--primary-hover</div>
              <div className="text-xs">Custom var test</div>
            </div>
            <div 
              className="p-4 rounded-lg cursor-pointer transition-colors"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                color: 'hsl(var(--secondary-foreground))'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--secondary-hover))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))'}
            >
              <div className="text-xs font-mono">--secondary-hover</div>
              <div className="text-xs">Custom var test</div>
            </div>
            <div 
              className="p-4 rounded-lg cursor-pointer transition-colors"
              style={{
                backgroundColor: 'hsl(var(--accent))',
                color: 'hsl(var(--accent-foreground))'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent-hover))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'}
            >
              <div className="text-xs font-mono">--accent-hover</div>
              <div className="text-xs">Custom var test</div>
            </div>
          </div>
        </section>

        {/* Elevation Colors */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Elevation Colors</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--elevation-1))' }}>
              <div className="text-xs font-mono mb-1">elevation-1</div>
              <div className="text-xs text-muted-foreground">Lightest</div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--elevation-2))' }}>
              <div className="text-xs font-mono mb-1">elevation-2</div>
              <div className="text-xs text-muted-foreground">Medium</div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--elevation-3))' }}>
              <div className="text-xs font-mono mb-1">elevation-3</div>
              <div className="text-xs text-muted-foreground">Highest</div>
            </div>
          </div>
        </section>

        {/* Status Colors */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Status Colors</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-success text-success-foreground rounded-lg">
              <div className="text-xs font-mono mb-1">success</div>
              <div className="text-xs">Green status</div>
            </div>
            <div className="p-4 bg-warning text-warning-foreground rounded-lg">
              <div className="text-xs font-mono mb-1">warning</div>
              <div className="text-xs">Yellow status</div>
            </div>
            <div className="p-4 bg-destructive text-destructive-foreground rounded-lg">
              <div className="text-xs font-mono mb-1">destructive</div>
              <div className="text-xs">Red status</div>
            </div>
            <div className="p-4 bg-info text-white rounded-lg">
              <div className="text-xs font-mono mb-1">info</div>
              <div className="text-xs">Blue status</div>
            </div>
          </div>
        </section>

        {/* Debug Info */}
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Debug Information</h2>
          <div className="bg-card border rounded-lg p-4 font-mono text-xs space-y-1">
            <div>Tailwind Version: 4.x (using @import)</div>
            <div>Theme System: CSS Variables (HSL)</div>
            <div>Dark Mode: Class-based (.dark)</div>
            <div className="pt-2 text-muted-foreground">
              ⚠️ If hover states don't work, the issue is likely with Tailwind 4 not generating utilities for custom CSS variables
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

