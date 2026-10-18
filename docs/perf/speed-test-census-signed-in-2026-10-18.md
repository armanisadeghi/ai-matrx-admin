## Speed-test census — 2026-10-18T16:00:29.289Z

base `shared preview (dev server — timings inflated, counts are what matter)` · identities admin, member · idle after settle 5000 ms · callers on

DB = every request to the database host (tables, rpc, auth, storage, realtime socket, functions). Before/after = request start vs the load trace's PAGE SETTLED.

| route | who | doc | landed on | DB before settle | DB after settle | server | Next/RSC | 3rd party | dup keys | JS files | JS KB | TTFB | FCP | LCP | CLS | settled |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /speed-test | admin | 200 |  | 1 | 8 | 1 | 3 | 4 | 0 | 230 | 89761 | 640 | 748 | 748 | 0 | 2445 |
| /chat/speed-test | admin | 200 |  | 3 | 12 | 1 | 5 | 4 | 1 | 231 | 89877 | 19010 | 19096 | 20596 | 0.001 | 20628 |
| /notes/speed-test | admin | 200 |  | 9 | 25 | 1 | 3 | 4 | 1 | 256 | 100282 | 25817 | 26072 | 30416 | 0.01 | 27933 |
| /marketing/speed-test | admin | 200 |  | 1 | 8 | 1 | 3 | 4 | 0 | 237 | 97664 | 17819 | 17912 | 17912 | 0 | 19506 |
| /agents/speed-test | admin | 200 | undefined | 0 | 9 | 1 | 4 | 6 | 3 | undefined | undefined | undefined | undefined | undefined | undefined | 18091 |
| /speed-test | member | 200 |  | 1 | 8 | 0 | 3 | 1 | 0 | 217 | 86901 | 1109 | 1256 | 1256 | 0 | 3645 |
| /chat/speed-test | member | 200 |  | 3 | 10 | 0 | 5 | 1 | 1 | 219 | 87030 | 19732 | 19840 | 21784 | 0.001 | 21798 |
| /notes/speed-test | member | 200 |  | 9 | 29 | 0 | 3 | 1 | 1 | 244 | 97435 | 17923 | 18236 | 22164 | 0 | 19951 |
| /marketing/speed-test | member | 200 |  | 1 | 8 | 0 | 3 | 1 | 0 | 225 | 94817 | 20971 | 21064 | 21064 | 0 | 22469 |
| /agents/speed-test | member | 200 |  | 1 | 8 | 0 | 3 | 1 | 0 | 219 | 87184 | 1301 | 1644 | 1644 | 0 | 3715 |

### /speed-test — admin

final path `/speed-test` · settled +2445ms · TTFB 640ms · FCP 748ms · LCP 748ms · CLS 0 · JS 230 files / 89761 KB (13405 KB wire) · static assets 232

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | before | next doc | GET | /speed-test?trace=load | 702 | 78736 | 200 |  | other |
| 2 | 651 | before | server | GET | cdn /87a6e699-3622-4869-8843-d0867456c0dd/system-files/variants/b79bd0df-b2ba-43c9-869c-8aa4fcd068be/avatar_xl.jpg?v=43b9f1da | 214 | 7410 | 200 |  | html speed-test |
| 3 | 1099 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=U6Z5DO5GIfjbXZCSclenc |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 4 | 2365 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 5 | 2376 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 6 | 2593 | after | db auth | GET | /.well-known/jwks.json | 226 | 911 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 7 | 2594 | after | db auth | OPTIONS | /.well-known/jwks.json | 140 | 0 | 200 |  | preflight |
| 8 | 2624 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 116 | 0 | 200 |  | preflight |
| 9 | 2624 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 281 | 1137 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 10 | 2653 | after | next | POST | /api/person/timezone | 373 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 11 | 2821 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 218 | 2407 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 12 | 2821 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 74 | 0 | 200 |  | preflight |
| 13 | 7684 | after | 3p | GET | analytics.google.com/health | 180 |  | net::ERR_FAILED |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 14 | 7685 | after | 3p | OPTIONS | analytics.google.com/health | 179 | 0 | 404 |  | preflight |
| 15 | 7865 | after | 3p | POST | analytics.google.com/g/collect?v=2&tid=G-Y9F6QPFLFM&gtm=45je6ae1v9176736964za200zd9176736964xf1&_p=17923392404 | 58 |  | canceled |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 16 | 8481 | after | db rpc | POST | shell_counts | 538 | 1429 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 17 | 8482 | after | db rpc | OPTIONS | shell_counts | 72 | 0 | 200 |  | preflight |
| 18 | 8482 | after | next | POST | /api/acquisition/first-touch | 161 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |

### /chat/speed-test — admin

final path `/chat/speed-test` · settled +20628ms · TTFB 19010ms · FCP 19096ms · LCP 20596ms · CLS 0.001 · JS 231 files / 89877 KB (13413 KB wire) · static assets 234

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | before | next doc | GET | /chat/speed-test?trace=load | 19031 | 80534 | 200 |  | other |
| 2 | 19014 | before | server | GET | cdn /87a6e699-3622-4869-8843-d0867456c0dd/system-files/variants/b79bd0df-b2ba-43c9-869c-8aa4fcd068be/avatar_xl.jpg?v=43b9f1da | 179 | 7408 | 200 |  | html speed-test |
| 3 | 19248 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=HWHEJd8bH3Pmblxdf6-1h |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 4 | 20474 | before | db rpc | OPTIONS | route_seed | 167 | 0 | 200 |  | preflight |
| 5 | 20474 | before | db rpc | POST | route_seed | 683 | 3310 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 6 | 20477 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 7 | 20488 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 8 | 20583 | before | next | POST | /__nextjs_original-stack-frames | 6 | 1486 | 200 | ×2 | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 9 | 20589 | before | next | POST | /__nextjs_original-stack-frames | 6 | 1260 | 200 | ×2 | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 10 | 21093 | after | db auth | OPTIONS | /.well-known/jwks.json | 67 | 0 | 200 |  | preflight |
| 11 | 21093 | after | db auth | GET | /.well-known/jwks.json | 143 | 912 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 12 | 21094 | after | next | POST | /api/person/timezone | 675 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 13 | 21103 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 74 | 0 | 200 |  | preflight |
| 14 | 21103 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 202 | 1137 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 15 | 21191 | after | db table | GET | conversation ?select=id,parent_conversation_id,last_request_id,title,last_activity_at,conversation_type | 192 | 1934 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 16 | 21191 | after | db table | OPTIONS | conversation ?select=id,parent_conversation_id,last_request_id,title,last_activity_at,conversation_type | 59 | 0 | 200 |  | preflight |
| 17 | 21238 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 190 | 2405 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 18 | 21239 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 65 | 0 | 200 |  | preflight |
| 19 | 21384 | after | db table | GET | user_request ?select=id,status&id=in.(87a9bd29-55b8-43dd-acaf-20eb19b6a1d2) | 182 | 956 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 20 | 21385 | after | db table | OPTIONS | user_request ?select=id,status&id=in.(87a9bd29-55b8-43dd-acaf-20eb19b6a1d2) | 60 | 0 | 200 |  | preflight |
| 21 | 25823 | after | 3p | GET | analytics.google.com/health | 179 |  | net::ERR_FAILED |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 22 | 25824 | after | 3p | OPTIONS | analytics.google.com/health | 179 | 0 | 404 |  | preflight |
| 23 | 26003 | after | 3p | POST | analytics.google.com/g/collect?v=2&tid=G-Y9F6QPFLFM&gtm=45je6ae1v9176736964za200zd9176736964xf1&_p=17923392914 | 70 |  | canceled |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 24 | 26709 | after | db rpc | POST | shell_counts | 463 | 1429 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 25 | 26710 | after | db rpc | OPTIONS | shell_counts | 64 | 0 | 200 |  | preflight |
| 26 | 26710 | after | next | POST | /api/acquisition/first-touch | 24 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |

### /notes/speed-test — admin

final path `/notes/speed-test` · settled +27933ms · TTFB 25817ms · FCP 26072ms · LCP 30416ms · CLS 0.01 · JS 256 files / 100282 KB (14792 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | before | next doc | GET | /notes/speed-test?trace=load | 26023 | 91025 | 200 |  | other |
| 2 | 25826 | before | server | GET | cdn /87a6e699-3622-4869-8843-d0867456c0dd/system-files/variants/b79bd0df-b2ba-43c9-869c-8aa4fcd068be/avatar_xl.jpg?v=43b9f1da | 207 | 7411 | 200 |  | html speed-test |
| 3 | 26192 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=xU6cpKmAzYRjFH_6_zWAA |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 4 | 27882 | before | db auth | OPTIONS | /.well-known/jwks.json | 175 | 0 | 200 |  | preflight |
| 5 | 27882 | before | db auth | GET | /.well-known/jwks.json | 251 | 810 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 6 | 27882 | before | db table | GET | notes ?select=id&deleted_at=is.null&order=id.asc&offset=0&limit=1000 | 930 | 9458 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 7 | 27882 | before | db rpc | POST | get_notes_shared_with_me | 305 | 967 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 8 | 27883 | before | db table | OPTIONS | notes ?select=id&deleted_at=is.null&order=id.asc&offset=0&limit=1000 | 184 | 0 | 200 |  | preflight |
| 9 | 27883 | before | db rpc | POST | list_my_presentable_assists | 296 | 3483 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 10 | 27884 | before | db rpc | OPTIONS | get_notes_shared_with_me | 173 | 0 | 200 |  | preflight |
| 11 | 27887 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 12 | 27889 | before | db rpc | OPTIONS | list_my_presentable_assists | 168 | 0 | 200 |  | preflight |
| 13 | 27890 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 14 | 28160 | after | 3p | OPTIONS | analytics.google.com/health | 199 | 0 | 404 |  | preflight |
| 15 | 28160 | after | 3p | GET | analytics.google.com/health | 200 |  | net::ERR_FAILED |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 16 | 28176 | after | db rpc | POST | shown_to_context | 325 | 1874 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 17 | 28176 | after | db rpc | OPTIONS | shown_to_context | 68 | 0 | 200 |  | preflight |
| 18 | 28361 | after | 3p | POST | analytics.google.com/g/collect?v=2&tid=G-Y9F6QPFLFM&gtm=45je6ae1v9176736964za200zd9176736964xf1&_p=17923393498 | 70 |  | canceled |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 19 | 28423 | after | next | POST | /api/person/timezone | 898 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 20 | 28424 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 196 | 2407 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 21 | 28426 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 61 | 0 | 200 |  | preflight |
| 22 | 28461 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 63 | 0 | 200 |  | preflight |
| 23 | 28461 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 201 | 1136 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 24 | 28502 | after | db table | GET | notes ?select=id,created_by,label,content_preview,home_scope_id,tags,updated_at,position,organiz | 579 | 54200 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 25 | 28502 | after | db table | OPTIONS | notes ?select=id,created_by,label,content_preview,home_scope_id,tags,updated_at,position,organiz | 69 | 0 | 200 |  | preflight |
| 26 | 28814 | after | db rpc | OPTIONS | assoc_for_sources ?order=position.asc.nullslast,created_at.asc,id.asc&offset=0&limit=1000 | 57 | 0 | 200 |  | preflight |
| 27 | 28814 | after | db rpc | POST | assoc_for_sources ?order=position.asc.nullslast,created_at.asc,id.asc&offset=0&limit=1000 | 464 | 3278 | 200 | ×2 | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 28 | 29088 | after | db rpc | POST | assoc_for_sources ?order=position.asc.nullslast,created_at.asc,id.asc&offset=0&limit=1000 | 538 | 16024 | 200 | ×2 | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 29 | 29280 | after | db rpc | POST | context_scopes | 1617 | 3330 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 30 | 29280 | after | db rpc | OPTIONS | context_scopes | 65 | 0 | 200 |  | preflight |
| 31 | 29741 | after | db rpc | POST | my_organizations_by_ids | 161 | 843 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 32 | 29742 | after | db rpc | OPTIONS | my_organizations_by_ids | 55 | 0 | 200 |  | preflight |
| 33 | 29747 | after | db rpc | POST | home_names | 599 | 2806 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 34 | 29748 | after | db rpc | OPTIONS | home_names | 75 | 0 | 200 |  | preflight |
| 35 | 30919 | after | db table | GET | assists ?select=dedupe_key&dedupe_key=in.(notes.unorganized:87a6e699-3622-4869-8843-d0867456c0dd)& | 183 | 932 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 36 | 30919 | after | db table | OPTIONS | assists ?select=dedupe_key&dedupe_key=in.(notes.unorganized:87a6e699-3622-4869-8843-d0867456c0dd)& | 60 | 0 | 200 |  | preflight |
| 37 | 31103 | after | db rpc | POST | my_assist_admission_decision | 155 | 889 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 38 | 31104 | after | db rpc | OPTIONS | my_assist_admission_decision | 55 | 0 | 200 |  | preflight |
| 39 | 31259 | after | db rpc | POST | emit_pending_assist | 227 | 833 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 40 | 31260 | after | db rpc | OPTIONS | emit_pending_assist | 58 | 0 | 200 |  | preflight |
| 41 | 34034 | after | db rpc | OPTIONS | shell_counts | 62 | 0 | 200 |  | preflight |
| 42 | 34034 | after | db rpc | POST | shell_counts | 467 | 1428 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 43 | 34035 | after | next | POST | /api/acquisition/first-touch | 751 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |

### /marketing/speed-test — admin

final path `/marketing/speed-test` · settled +19506ms · TTFB 17819ms · FCP 17912ms · LCP 17912ms · CLS 0 · JS 237 files / 97664 KB (13843 KB wire) · static assets 239

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /marketing/speed-test?trace=load | 17849 | 79917 | 200 |  | other |
| 2 | 17823 | before | server | GET | cdn /87a6e699-3622-4869-8843-d0867456c0dd/system-files/variants/b79bd0df-b2ba-43c9-869c-8aa4fcd068be/avatar_xl.jpg?v=43b9f1da | 187 | 7415 | 200 |  | html speed-test |
| 3 | 18037 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=IpbeQPQ_zYkk5gsdP_IRu |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 4 | 19308 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 5 | 19318 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 6 | 19755 | after | 3p | GET | analytics.google.com/health | 173 |  | net::ERR_FAILED |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 7 | 19756 | after | 3p | OPTIONS | analytics.google.com/health | 172 | 0 | 404 |  | preflight |
| 8 | 19929 | after | 3p | POST | analytics.google.com/g/collect?v=2&tid=G-Y9F6QPFLFM&gtm=45je6ae1v9176736964za200zd9176736964xf1&_p=17923393997 | 69 |  | canceled |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 9 | 19984 | after | db auth | OPTIONS | /.well-known/jwks.json | 136 | 0 | 200 |  | preflight |
| 10 | 19984 | after | db auth | GET | /.well-known/jwks.json | 221 | 911 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 11 | 19984 | after | next | POST | /api/person/timezone | 649 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 12 | 20008 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 112 | 0 | 200 |  | preflight |
| 13 | 20008 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 249 | 1137 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 14 | 20207 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 215 | 2406 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 15 | 20207 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 91 | 0 | 200 |  | preflight |
| 16 | 25582 | after | db rpc | POST | shell_counts | 493 | 1426 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 17 | 25582 | after | db rpc | OPTIONS | shell_counts | 74 | 0 | 200 |  | preflight |
| 18 | 25583 | after | next | POST | /api/acquisition/first-touch | 77 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |

### /agents/speed-test — admin

final path `undefined` · settled +18091ms · TTFB undefinedms · FCP undefinedms · LCP undefinedms · CLS undefined · JS undefined files / undefined KB (undefined KB wire) · static assets 233 · ERROR Error: page.evaluate: Execution context was destroyed, most likely because of a navigation

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1792339430079 | after | next doc | GET | /agents/speed-test?trace=load | 16818 | 91488 | 200 | ×2 | other |
| 2 | 1792339446663 | after | server | GET | cdn /87a6e699-3622-4869-8843-d0867456c0dd/system-files/variants/b79bd0df-b2ba-43c9-869c-8aa4fcd068be/avatar_xl.jpg?v=43b9f1da | 270 | 7416 | 200 |  | html speed-test |
| 3 | 1792339446887 | after | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=K_Qhcw0rjgwdTvvFz7mTr |  |  | ws | ×3 | TappedWebSocket@_1-453gk-1pxja |
| 4 | 1792339448097 | after | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 5 | 1792339448107 | after | next | GET | /__dev-walk?stream=1 | 13122 |  | net::ERR_INCOMPLETE_CHUNKED_ENCODING | ×2 | other |
| 6 | 1792339448380 | after | 3p | OPTIONS | analytics.google.com/health | 176 | 0 | 404 |  | preflight |
| 7 | 1792339448380 | after | 3p | GET | analytics.google.com/health | 177 |  | net::ERR_FAILED |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 8 | 1792339448558 | after | 3p | POST | analytics.google.com/g/collect?v=2&tid=G-Y9F6QPFLFM&gtm=45je6af0h2v9176736964za200zd9176736964xf1&_p=179233944 | 68 |  | canceled |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 9 | 1792339448608 | after | db auth | GET | /.well-known/jwks.json | 191 | 911 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 10 | 1792339448609 | after | db auth | OPTIONS | /.well-known/jwks.json | 124 | 0 | 200 |  | preflight |
| 11 | 1792339448609 | after | next | POST | /api/person/timezone | 924 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 12 | 1792339448621 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 242 | 1136 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 13 | 1792339448623 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.87a6e699-3622-4869-8843-d0 | 117 | 0 | 200 |  | preflight |
| 14 | 1792339448800 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 177 | 2403 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 15 | 1792339448801 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 55 | 0 | 200 |  | preflight |
| 16 | 1792339454240 | after | db rpc | POST | shell_counts | 478 | 1427 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 17 | 1792339454241 | after | db rpc | OPTIONS | shell_counts | 59 | 0 | 200 |  | preflight |
| 18 | 1792339454241 | after | next | POST | /api/acquisition/first-touch | 270 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 19 | 1792339462231 | after | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=K_Qhcw0rjgwdTvvFz7mTr |  |  | ws | ×3 | TappedWebSocket@_1-453gk-1pxja |
| 20 | 1792339463234 | after | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=K_Qhcw0rjgwdTvvFz7mTr |  |  | ws | ×3 | TappedWebSocket@_1-453gk-1pxja |
| 21 | 1792339464230 | after | next | GET | /__dev-walk?stream=1 |  |  | 200 | ×2 | other |
| 22 | 1792339476424 | after | next doc | GET | /agents/speed-test?trace=load | 93172 |  | canceled | ×2 | script |

### /speed-test — member

final path `/speed-test` · settled +3645ms · TTFB 1109ms · FCP 1256ms · LCP 1256ms · CLS 0 · JS 217 files / 86901 KB (13001 KB wire) · static assets 219

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /speed-test?trace=load | 1213 | 72735 | 200 |  | other |
| 2 | 1360 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=WxJYjjtReQOiwkTu9FjtH |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 3 | 3599 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 4 | 3611 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 5 | 4074 | after | db auth | GET | /.well-known/jwks.json | 193 | 913 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 6 | 4075 | after | db auth | OPTIONS | /.well-known/jwks.json | 129 | 0 | 200 |  | preflight |
| 7 | 4075 | after | next | POST | /api/person/timezone | 846 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 8 | 4102 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 231 | 1133 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 9 | 4104 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 111 | 0 | 200 |  | preflight |
| 10 | 4269 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 185 | 2404 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 11 | 4269 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 57 | 0 | 200 |  | preflight |
| 12 | 9704 | after | db rpc | POST | shell_counts | 920 | 1253 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 13 | 9705 | after | db rpc | OPTIONS | shell_counts | 65 | 0 | 200 |  | preflight |
| 14 | 9705 | after | next | POST | /api/acquisition/first-touch | 7657 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |

### /chat/speed-test — member

final path `/chat/speed-test` · settled +21798ms · TTFB 19732ms · FCP 19840ms · LCP 21784ms · CLS 0.001 · JS 219 files / 87030 KB (13013 KB wire) · static assets 222

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | before | next doc | GET | /chat/speed-test?trace=load | 19764 | 74606 | 200 |  | other |
| 2 | 19969 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=XHklwHANH-mtLrdYSS90i |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 3 | 21660 | before | db rpc | POST | route_seed | 344 | 2470 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 4 | 21661 | before | db rpc | OPTIONS | route_seed | 189 | 0 | 200 |  | preflight |
| 5 | 21662 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 6 | 21672 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 7 | 21746 | before | next | POST | /__nextjs_original-stack-frames | 6 | 1486 | 200 | ×2 | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 8 | 21780 | before | next | POST | /__nextjs_original-stack-frames | 8 | 1260 | 200 | ×2 | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 9 | 22040 | after | db table | GET | conversation ?select=id,parent_conversation_id,last_request_id,title,last_activity_at,conversation_type | 232 | 1667 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 10 | 22040 | after | db table | OPTIONS | conversation ?select=id,parent_conversation_id,last_request_id,title,last_activity_at,conversation_type | 62 | 0 | 200 |  | preflight |
| 11 | 22481 | after | db auth | OPTIONS | /.well-known/jwks.json | 60 | 0 | 200 |  | preflight |
| 12 | 22481 | after | db auth | GET | /.well-known/jwks.json | 129 | 911 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 13 | 22481 | after | next | POST | /api/person/timezone | 586 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 14 | 22507 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 194 | 1133 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 15 | 22508 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 77 | 0 | 200 |  | preflight |
| 16 | 22611 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 166 | 2406 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 17 | 22611 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 56 | 0 | 200 |  | preflight |
| 18 | 27883 | after | db rpc | OPTIONS | shell_counts | 102 | 0 | 200 |  | preflight |
| 19 | 27883 | after | db rpc | POST | shell_counts | 701 | 1255 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 20 | 27884 | after | next | POST | /api/acquisition/first-touch | 176 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |

### /notes/speed-test — member

final path `/notes/speed-test` · settled +19951ms · TTFB 17923ms · FCP 18236ms · LCP 22164ms · CLS 0 · JS 244 files / 97435 KB (14392 KB wire) · static assets 247

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /notes/speed-test?trace=load | 18304 | 82930 | 200 |  | other |
| 2 | 18390 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=tO8AKYp86-E6OwAsXY7II |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 3 | 19892 | before | db auth | OPTIONS | /.well-known/jwks.json | 173 | 0 | 200 |  | preflight |
| 4 | 19892 | before | db auth | GET | /.well-known/jwks.json | 249 | 811 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 5 | 19893 | before | db table | OPTIONS | notes ?select=id&deleted_at=is.null&order=id.asc&offset=0&limit=1000 | 177 | 0 | 200 |  | preflight |
| 6 | 19893 | before | db rpc | OPTIONS | get_notes_shared_with_me | 178 | 0 | 200 |  | preflight |
| 7 | 19893 | before | db rpc | OPTIONS | list_my_presentable_assists | 171 | 0 | 200 |  | preflight |
| 8 | 19893 | before | db table | GET | notes ?select=id&deleted_at=is.null&order=id.asc&offset=0&limit=1000 | 866 | 5136 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 9 | 19893 | before | db rpc | POST | get_notes_shared_with_me | 321 | 398 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 10 | 19893 | before | db rpc | POST | list_my_presentable_assists | 317 | 2588 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 11 | 19895 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 12 | 19900 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 13 | 20143 | after | db rpc | POST | shown_to_context | 275 | 1229 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 14 | 20143 | after | db rpc | OPTIONS | shown_to_context | 67 | 0 | 200 |  | preflight |
| 15 | 20431 | after | next | POST | /api/person/timezone | 863 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 16 | 20432 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 68 | 0 | 200 |  | preflight |
| 17 | 20432 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 214 | 2404 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 18 | 20441 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 66 | 0 | 200 |  | preflight |
| 19 | 20441 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 223 | 1133 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 20 | 20442 | after | db table | GET | notes ?select=id,created_by,label,content_preview,home_scope_id,tags,updated_at,position,organiz | 861 | 18325 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 21 | 20442 | after | db table | OPTIONS | notes ?select=id,created_by,label,content_preview,home_scope_id,tags,updated_at,position,organiz | 67 | 0 | 200 |  | preflight |
| 22 | 20665 | after | db table | GET | user_preferences ?select=user_id,version,preferences&user_id=eq.4060701e-706a-4c76-b3ca-0bbc69fa5a14 | 201 | 3467 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 23 | 20666 | after | db table | OPTIONS | user_preferences ?select=user_id,version,preferences&user_id=eq.4060701e-706a-4c76-b3ca-0bbc69fa5a14 | 66 | 0 | 200 |  | preflight |
| 24 | 20760 | after | db rpc | OPTIONS | assoc_for_sources ?order=position.asc.nullslast,created_at.asc,id.asc&offset=0&limit=1000 | 61 | 0 | 200 |  | preflight |
| 25 | 20760 | after | db rpc | POST | assoc_for_sources ?order=position.asc.nullslast,created_at.asc,id.asc&offset=0&limit=1000 | 900 | 1692 | 200 | ×2 | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 26 | 20868 | after | db table | OPTIONS | user_preferences ?user_id=eq.4060701e-706a-4c76-b3ca-0bbc69fa5a14&version=eq.1049&select=user_id,version,pr | 56 | 0 | 200 |  | preflight |
| 27 | 20868 | after | db table | PATCH | user_preferences ?user_id=eq.4060701e-706a-4c76-b3ca-0bbc69fa5a14&version=eq.1049&select=user_id,version,pr | 239 | 3414 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 28 | 21305 | after | db rpc | POST | assoc_for_sources ?order=position.asc.nullslast,created_at.asc,id.asc&offset=0&limit=1000 | 759 | 3227 | 200 | ×2 | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 29 | 21662 | after | db rpc | POST | context_scopes | 1465 | 1740 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 30 | 21662 | after | db rpc | OPTIONS | context_scopes | 64 | 0 | 200 |  | preflight |
| 31 | 22152 | after | db rpc | POST | my_organizations_by_ids | 159 | 844 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 32 | 22153 | after | db rpc | OPTIONS | my_organizations_by_ids | 53 | 0 | 200 |  | preflight |
| 33 | 22158 | after | db rpc | OPTIONS | home_names | 64 | 0 | 200 |  | preflight |
| 34 | 22158 | after | db rpc | POST | home_names | 857 | 1783 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 35 | 23140 | after | db table | GET | assists ?select=dedupe_key&dedupe_key=in.(notes.unorganized:4060701e-706a-4c76-b3ca-0bbc69fa5a14)& | 209 | 930 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 36 | 23140 | after | db table | OPTIONS | assists ?select=dedupe_key&dedupe_key=in.(notes.unorganized:4060701e-706a-4c76-b3ca-0bbc69fa5a14)& | 76 | 0 | 200 |  | preflight |
| 37 | 23351 | after | db rpc | POST | my_assist_admission_decision | 165 | 886 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 38 | 23351 | after | db rpc | OPTIONS | my_assist_admission_decision | 57 | 0 | 200 |  | preflight |
| 39 | 23517 | after | db rpc | OPTIONS | emit_pending_assist | 53 | 0 | 200 |  | preflight |
| 40 | 23517 | after | db rpc | POST | emit_pending_assist | 201 | 834 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 41 | 26026 | after | db rpc | OPTIONS | shell_counts | 60 | 0 | 200 |  | preflight |
| 42 | 26026 | after | db rpc | POST | shell_counts | 733 | 1251 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 43 | 26027 | after | next | POST | /api/acquisition/first-touch | 333 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |

### /marketing/speed-test — member

final path `/marketing/speed-test` · settled +22469ms · TTFB 20971ms · FCP 21064ms · LCP 21064ms · CLS 0 · JS 225 files / 94817 KB (13443 KB wire) · static assets 227

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /marketing/speed-test?trace=load | 21071 | 74050 | 200 |  | other |
| 2 | 21196 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=n7c2uRJsAL_yFdE7I3A_p |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 3 | 22381 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 4 | 22391 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 5 | 22709 | after | db auth | GET | /.well-known/jwks.json | 202 | 912 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 6 | 22710 | after | db auth | OPTIONS | /.well-known/jwks.json | 133 | 0 | 200 |  | preflight |
| 7 | 22710 | after | next | POST | /api/person/timezone | 3757 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 8 | 22718 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 124 | 0 | 200 |  | preflight |
| 9 | 22718 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 250 | 1131 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 10 | 22913 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 177 | 2407 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 11 | 22913 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 55 | 0 | 200 |  | preflight |
| 12 | 28572 | after | db rpc | OPTIONS | shell_counts | 65 | 0 | 200 |  | preflight |
| 13 | 28572 | after | db rpc | POST | shell_counts | 571 | 1253 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 14 | 28573 | after | next | POST | /api/acquisition/first-touch | 321 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |

### /agents/speed-test — member

final path `/agents/speed-test` · settled +3715ms · TTFB 1301ms · FCP 1644ms · LCP 1644ms · CLS 0 · JS 219 files / 87184 KB (13018 KB wire) · static assets 221

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /agents/speed-test?trace=load | 1889 | 74465 | 200 |  | other |
| 2 | 1861 | before | 3p | WS | speed-test-census.localhost:3001/_next/hmr?id=UPopHletMNPcWeMdN2P1A |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja |
| 3 | 3672 | before | db realtime | WS | /websocket ?apikey=sb_publishable_scm0jzEJiFUB5ItiqOx5Fg_8BOj |  |  | ws |  | TappedWebSocket@_1-453gk-1pxja < connect@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq < open@0y7i_%40ai-matrx_data_dist_1421r_p4f28sq |
| 4 | 3682 | before | next | GET | /__dev-walk?stream=1 |  |  | 200 |  | other |
| 5 | 3858 | after | db auth | OPTIONS | /.well-known/jwks.json | 137 | 0 | 200 |  | preflight |
| 6 | 3858 | after | db auth | GET | /.well-known/jwks.json | 251 | 911 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 7 | 3858 | after | next | POST | /api/person/timezone | 3691 | 341 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 8 | 3867 | after | db table | OPTIONS | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 117 | 0 | 200 |  | preflight |
| 9 | 3867 | after | db table | GET | user_surface_state ?select=surface_key,state,version&deleted_at=is.null&user_id=eq.4060701e-706a-4c76-b3ca-0b | 263 | 1136 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 10 | 4111 | after | db table | GET | ui_surface ?select=*&name=eq.matrx-user/canvas | 207 | 2406 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 11 | 4111 | after | db table | OPTIONS | ui_surface ?select=*&name=eq.matrx-user/canvas | 69 | 0 | 200 |  | preflight |
| 12 | 9780 | after | db rpc | POST | shell_counts | 603 | 1248 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
| 13 | 9781 | after | db rpc | OPTIONS | shell_counts | 66 | 0 | 200 |  | preflight |
| 14 | 9782 | after | next | POST | /api/acquisition/first-touch | 291 | 304 | 200 |  | tracedFetch@_1-453gk-1pxja < tappedFetch@_1-453gk-1pxja < window.fetch@lib_0eykc76gb7xhc |
