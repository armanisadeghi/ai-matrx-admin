// Loading skeleton shown while server fetches note content
// Matches the editor layout structure for a smooth transition

export default function NoteLoading() {
  return (
    <div className="notes-editor note-detail-active">
      {/* Toolbar skeleton */}
      <div className="notes-toolbar">
        <div
          className="notes-skeleton-line"
          style={{ width: "200px", height: "1.25rem" }}
        />
      </div>

      {/* Content skeleton */}
      <div className="notes-skeleton" style={{ flex: 1 }}>
        <div className="notes-skeleton-line" />
        <div className="notes-skeleton-line" />
        <div className="notes-skeleton-line" />
        <div className="notes-skeleton-line" />
        <div className="notes-skeleton-line" />
        <div className="notes-skeleton-line" />
      </div>

      {/* Status bar skeleton */}
      <div className="notes-editor-status">
        <div
          className="notes-skeleton-line"
          style={{ width: "100px", height: "0.625rem" }}
        />
      </div>
    </div>
  );
}
