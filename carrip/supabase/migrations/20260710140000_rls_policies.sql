-- Carrip RLS policies
-- Supabase Dashboard → SQL Editor でこのファイルを実行してください。
-- 再帰修正版: 20260710150000_fix_rls_recursion.sql も続けて実行してください。

-- trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select_own" ON trips;
CREATE POLICY "trips_select_own"
  ON trips FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "trips_insert_own" ON trips;
CREATE POLICY "trips_insert_own"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "trips_update_own" ON trips;
CREATE POLICY "trips_update_own"
  ON trips FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "trips_delete_own" ON trips;
CREATE POLICY "trips_delete_own"
  ON trips FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ヘルパー関数（SECURITY DEFINER: RLS 再帰を防ぐ）
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

GRANT EXECUTE ON FUNCTION public.user_owns_trip(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_route(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_route_publicly_shared(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_publicly_shared(uuid) TO anon, authenticated;

-- routes
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

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

-- pois
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pois_select_all" ON pois;
CREATE POLICY "pois_select_all"
  ON pois FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "pois_insert_authenticated" ON pois;
CREATE POLICY "pois_insert_authenticated"
  ON pois FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- shares
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shares_select_own" ON shares;
CREATE POLICY "shares_select_own"
  ON shares FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "shares_insert_own" ON shares;
CREATE POLICY "shares_insert_own"
  ON shares FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND user_owns_route(route_id)
  );

DROP POLICY IF EXISTS "shares_select_public" ON shares;
CREATE POLICY "shares_select_public"
  ON shares FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

-- 共有閲覧用 trip
DROP POLICY IF EXISTS "trips_select_shared" ON trips;
CREATE POLICY "trips_select_shared"
  ON trips FOR SELECT
  TO anon, authenticated
  USING (is_trip_publicly_shared(id));
