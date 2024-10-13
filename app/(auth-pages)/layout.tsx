// app/(auth-pages)/DynamicLayout.tsx

export default async function Layout(
    {
        children,
    }: {
        children: React.ReactNode;
    }) {
    return (
        <>
            {children}
            {/*
      Commenting out the following line:
      <div className="max-w-7xl flex flex-col gap-12 items-start">{children}</div>
      */}
        </>
    );
}
