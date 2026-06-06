# Carrip ER図

**プロジェクト名：** Carrip（カーリップ）  
**対象DB：** Supabase（PostgreSQL）

```mermaid
erDiagram
  auth_users {
    uuid id PK
    text email
  }
  trips {
    uuid id PK
    uuid owner_id FK
    text origin
    text[] prefecture
    date departure_date
    smallint days
    smallint people
    jsonb vehicle_json
    integer budget_per_person
    text[] preferences
    jsonb options_json
    timestamptz last_accessed_at
    timestamptz created_at
    timestamptz updated_at
  }
  routes {
    uuid id PK
    uuid trip_id FK
    smallint rank
    numeric score
    numeric total_distance_km
    integer total_duration_min
    integer total_cost
    integer cost_per_person
    jsonb cost_breakdown_json
    boolean is_confirmed
    timestamptz created_at
    timestamptz updated_at
  }
  route_stops {
    uuid id PK
    uuid route_id FK
    uuid poi_id FK
    smallint stop_order
    smallint day_number
    integer stay_minutes
    integer parking_cost
    integer admission_fee
    boolean is_rest_stop
    timestamptz created_at
  }
  pois {
    uuid id PK
    text google_place_id
    text name
    text prefecture
    text category
    numeric rating
    integer review_count
    numeric lat
    numeric lng
    jsonb opening_hours_json
    jsonb parking_info_json
    integer default_admission_fee
    timestamptz cached_at
    timestamptz cache_expires_at
  }
  shares {
    uuid id PK
    uuid route_id FK
    text short_code
    uuid created_by FK
    timestamptz expires_at
    timestamptz created_at
  }
  external_prices {
    uuid id PK
    text type
    text key
    jsonb value_json
    text source
    timestamptz updated_at
    smallint ttl_days
    timestamptz expires_at
  }

  auth_users ||--o{ trips : "owner_id (RESTRICT)"
  auth_users ||--o{ shares : "created_by (RESTRICT)"
  trips ||--o{ routes : "trip_id (CASCADE)"
  routes ||--o{ route_stops : "route_id (CASCADE)"
  routes ||--o{ shares : "route_id (CASCADE)"
  pois ||--o{ route_stops : "poi_id (RESTRICT)"
```

## リレーション一覧

| 親テーブル | 子テーブル | FK カラム | ON DELETE |
|-----------|-----------|----------|-----------|
| auth_users | trips | owner_id | RESTRICT |
| auth_users | shares | created_by | RESTRICT |
| trips | routes | trip_id | CASCADE |
| routes | route_stops | route_id | CASCADE |
| routes | shares | route_id | CASCADE |
| pois | route_stops | poi_id | RESTRICT |

## 備考

- `external_prices` は他テーブルとの外部キー関係なしの独立テーブル
- `auth_users` は Supabase Auth が管理するため直接 DDL 不要
