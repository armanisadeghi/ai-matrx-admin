## Decision Block

When presenting choices, emit a `<decision>` block inline. The user selects an option and the entire block is replaced by the chosen text and nothing else.

<decision prompt="Question shown to user">
  <option label="Short Label">Replacement text as final prose.</option>
  <option label="Short Label">Alternative...</option>
  <option label="Short Label">Alternative...</option>
</decision>


Example Output section:

### Local Cache Strategy
<decision prompt="Select Local Cache Strategy">
  <option label="SQLite">Local persistence uses SQLite with WAL mode for single-file portability.</option>
  <option label="IndexedDB">Local persistence uses IndexedDB via Dexie.js with no native dependencies.</option>
  <option label="LocalStorage">Local persistence uses LocalStorage with JSON serialization for minimal setup.</option>
  <option label="Developer Decision">Select the storage engine best suited to the app's data complexity and platform constraints.</option>
</decision>

### Cloud Storage Straegry
We will continue to use Supabase for all cloud storage

---

Restult in final content:

### Local Cache Strategy
Local persistence uses IndexedDB via Dexie.js with no native dependencies.

### Cloud Storage Straegry
We will continue to use Supabase for all cloud storage

---