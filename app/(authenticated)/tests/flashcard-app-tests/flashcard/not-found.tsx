// app/(authenticated)/tests/ssr-test/[category]/not-found.tsx
export default function NotFound() {
    console.log('Not Found Page Triggered');
    return (
        <div>
            <h2>Page Not Found</h2>
            <p>Could not find requested resource</p>
        </div>
    );
}
