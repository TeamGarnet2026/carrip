-- Fix: infinite recursion in RLS policies (trips <-> routes)
-- Supabase Dashboard → SQL Editor でこのファイルを実行してください。

-- 所有権チェック用ヘルパー（SECURITY DEFINER で RLS をバイパスし再帰を防ぐ）
CREATE OR REPLACE FUNCTION public.user_owns_trip(trip_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips
    WHERE id = trip_uuid
      AND owner_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_route(route_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.routes r
    JOIN public.trips t ON t.id = r.trip_id
    WHERE r.id = route_uuid
      AND t.owner_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_route_publicly_shared(route_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shares
    WHERE route_id = route_uuid
      AND expires_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_publicly_shared(trip_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.routes r
    JOIN public.shares s ON s.route_id = r.id
    WHERE r.trip_id = trip_uuid
      AND s.expires_at > now()
  );
$$;

-- routes: trips への直接参照をヘルパー関数に置き換え
DROP POLICY IF EXISTS "routes_select_own" ON routes;
CREATE POLICY "routes_select_own"
  ON routes FOR SELECT
  TO authenticated
  USING (user_owns_trip(trip_id));

DROP POLICY IF EXISTS "routes_insert_own" ON routes;
CREATE POLICY "routes_insert_own"
  ON routes FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_trip(trip_id));

DROP POLICY IF EXISTS "routes_update_own" ON routes;
CREATE POLICY "routes_update_own"
  ON routes FOR UPDATE
  TO authenticated
  USING (user_owns_trip(trip_id))
  WITH CHECK (user_owns_trip(trip_id));

DROP POLICY IF EXISTS "routes_delete_own" ON routes;
CREATE POLICY "routes_delete_own"
  ON routes FOR DELETE
  TO authenticated
  USING (user_owns_trip(trip_id));

DROP POLICY IF EXISTS "routes_select_shared" ON routes;
CREATE POLICY "routes_select_shared"
  ON routes FOR SELECT
  TO anon, authenticated
  USING (is_route_publicly_shared(id));

-- route_stops
DROP POLICY IF EXISTS "route_stops_select_own" ON route_stops;
CREATE POLICY "route_stops_select_own"
  ON route_stops FOR SELECT
  TO authenticated
  USING (user_owns_route(route_id));

DROP POLICY IF EXISTS "route_stops_insert_own" ON route_stops;
CREATE POLICY "route_stops_insert_own"
  ON route_stops FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_route(route_id));

DROP POLICY IF EXISTS "route_stops_update_own" ON route_stops;
CREATE POLICY "route_stops_update_own"
  ON route_stops FOR UPDATE
  TO authenticated
  USING (user_owns_route(route_id))
  WITH CHECK (user_owns_route(route_id));

DROP POLICY IF EXISTS "route_stops_delete_own" ON route_stops;
CREATE POLICY "route_stops_delete_own"
  ON route_stops FOR DELETE
  TO authenticated
  USING (user_owns_route(route_id));

DROP POLICY IF EXISTS "route_stops_select_shared" ON route_stops;
CREATE POLICY "route_stops_select_shared"
  ON route_stops FOR SELECT
  TO anon, authenticated
  USING (is_route_publicly_shared(route_id));

-- shares
DROP POLICY IF EXISTS "shares_insert_own" ON shares;
CREATE POLICY "shares_insert_own"
  ON shares FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND user_owns_route(route_id)
  );

-- trips: routes への直接参照をヘルパー関数に置き換え
DROP POLICY IF EXISTS "trips_select_shared" ON trips;
CREATE POLICY "trips_select_shared"
  ON trips FOR SELECT
  TO anon, authenticated
  USING (is_trip_publicly_shared(id));

-- 関数の実行権限
GRANT EXECUTE ON FUNCTION public.user_owns_trip(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_route(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_route_publicly_shared(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_publicly_shared(uuid) TO anon, authenticated;
