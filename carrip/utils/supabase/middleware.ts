import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isProtectedPath(pathname: string): boolean {
  if (pathname === '/trips' || pathname.startsWith('/trips/')) {
    return true
  }
  if (/^\/plan\/[^/]+\/confirmed/.test(pathname)) {
    return true
  }
  if (/^\/plan\/[^/]+\/share/.test(pathname)) {
    return true
  }
  return false
}

function safeRedirectPath(path: string | null): string {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    return path
  }
  return '/trips'
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set(
      'redirectTo',
      pathname + request.nextUrl.search
    )
    return NextResponse.redirect(loginUrl)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const redirectTo = safeRedirectPath(
      request.nextUrl.searchParams.get('redirectTo')
    )
    const url = request.nextUrl.clone()
    url.pathname = redirectTo
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
