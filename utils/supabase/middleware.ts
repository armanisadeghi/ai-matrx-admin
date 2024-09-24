import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    console.log("Supabase Middleware - Current path:", request.nextUrl.pathname); // Debug log

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                  request.cookies.set(name, value)
              );
              response = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                  response.cookies.set(name, value, options)
              );
            },
          },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    console.log("Current path:", request.nextUrl.pathname); // Debug log

    // Function to create a new URL while preserving all original parameters
    const createUrlWithParams = (newPath: string) => {
      const newUrl = new URL(newPath, request.url);
      request.nextUrl.searchParams.forEach((value, key) => {
        newUrl.searchParams.set(key, value);
      });
      return newUrl;
    };

    // Check if the user is authenticated and trying to access a protected route
    if (!user && !request.nextUrl.pathname.startsWith('/auth') && request.nextUrl.pathname !== '/sign-in') {
      const signInUrl = createUrlWithParams("/sign-in");
      const fullPath = request.nextUrl.pathname + request.nextUrl.search;
      signInUrl.searchParams.set("redirectTo", fullPath);
      console.log("Redirecting to sign-in with redirectTo:", fullPath); // Debug log
      return NextResponse.redirect(signInUrl);
    }

    if (request.nextUrl.pathname === "/" && user) {
      return NextResponse.redirect(createUrlWithParams("/protected"));
    }

    console.log("Returning response for path:", request.nextUrl.pathname); // Debug log
    return response;
  } catch (e) {
    console.error("Error in updateSession:", e); // Debug log
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
