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

function isAuthPage(pathname: string): boolean {
  return pathname === '/login' || pathname === '/signup'
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
    )
}

function safeRedirectPath(path: string | null): string {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    return path
  }
  return '/trips'
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const needsAuthCheck =
    isProtectedPath(pathname) ||
    isAuthPage(pathname) ||
    hasSupabaseAuthCookie(request)

  // 公開ページかつ未ログイン時は Supabase 往復をスキップして体感速度を上げる
  if (!needsAuthCheck) {
    return NextResponse.next({ request })
  }

  if (!hasSupabaseAuthCookie(request) && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set(
      'redirectTo',
      pathname + request.nextUrl.search
    )
    return NextResponse.redirect(loginUrl)
  }

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

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set(
      'redirectTo',
      pathname + request.nextUrl.search
    )
    return NextResponse.redirect(loginUrl)
  }

  if (user && isAuthPage(pathname)) {
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
