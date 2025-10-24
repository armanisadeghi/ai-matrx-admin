// app/(authenticated)/tests/ssr-test/not-found.tsx
export default function NotFound() {
    // Removed console.log to clean up build logs
    return (
        <div>
            <h2>Page Not Found</h2>
            <p>Could not find requested resource</p>
        </div>
    );
}
