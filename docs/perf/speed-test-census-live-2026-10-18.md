## Speed-test census — 2026-10-18T04:43:01.205Z

base `https://www.aimatrx.com` · identities anon · idle after settle 5000 ms · callers off

DB = every request to the database host (tables, rpc, auth, storage, realtime socket, functions). Before/after = request start vs the load trace's PAGE SETTLED.

| route | who | doc | landed on | DB before settle | DB after settle | server | Next/RSC | 3rd party | dup keys | JS files | JS KB | TTFB | FCP | LCP | CLS | settled |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| /speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 641 | 784 | 784 | 0 | 1474 |
| /acquisition/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 1211 | 1432 | 1432 | 0 | 1967 |
| /administration/speed-test | anon |  | /login | 0 | 0 | 0 | 0 | 13 | 3 | 92 | 4964 | 2705 | 2828 | 2828 | 0 | never |
| /agent-connections/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 250 | 13600 | 876 | 1068 | 1068 | 0 | 1658 |
| /agents/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 251 | 13585 | 762 | 888 | 888 | 0 | 1394 |
| /applets/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13573 | 712 | 832 | 832 | 0 | 1394 |
| /approvals/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13574 | 885 | 1124 | 1124 | 0 | 1580 |
| /artifacts/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 250 | 13569 | 700 | 948 | 948 | 0 | 1512 |
| /board/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13571 | 651 | 816 | 816 | 0 | 1341 |
| /camera/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13573 | 799 | 968 | 968 | 0 | 1488 |
| /chat/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 251 | 13574 | 363 | 496 | 496 | 0 | 984 |
| /cms/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 250 | 13569 | 2929 | 3120 | 3120 | 0 | 3667 |
| /code/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 251 | 13575 | 3130 | 3284 | 3284 | 0 | 3955 |
| /context-items/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 250 | 13569 | 970 | 1252 | 1252 | 0 | 1870 |
| /crm/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13573 | 2530 | 2728 | 2728 | 0 | 3325 |
| /dashboard/speed-test | anon | 200 | /login | 0 | 0 | 0 | 8 | 3 | 3 | 90 | 4861 | 302 | 532 | 532 | 0 | never |
| /data/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 249 | 13577 | 946 | 1144 | 1144 | 0 | 1683 |
| /decisions/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 727 | 928 | 928 | 0 | 3053 |
| /detail/speed-test | anon | 200 | /login | 0 | 0 | 0 | 8 | 3 | 3 | 90 | 4861 | 673 | 816 | 816 | 0 | never |
| /devices/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 671 | 852 | 852 | 0 | 1369 |
| /dictionary/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13574 | 605 | 732 | 732 | 0 | 1277 |
| /documents/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 249 | 13578 | 743 | 900 | 900 | 0 | 1364 |
| /drive/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 468 | 712 | 712 | 0 | 1224 |
| /education/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 255 | 13667 | 4618 | 4780 | 4780 | 0 | 5389 |
| /esign/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 250 | 13569 | 587 | 788 | 788 | 0 | 1284 |
| /exports/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 540 | 692 | 692 | 0 | 1230 |
| /features/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 581 | 756 | 756 | 0 | 1471 |
| /files/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 251 | 13585 | 2742 | 2936 | 2936 | 0 | 3495 |
| /hr/speed-test | anon | 200 | /login | 0 | 0 | 0 | 8 | 3 | 3 | 90 | 4861 | 325 | 448 | 448 | 0 | never |
| /images/speed-test | anon | 200 |  | 0 | 0 | 0 | 43 | 0 | 20 | 252 | 13599 | 634 | 772 | 772 | 0 | 1265 |
| /knowledge-graph/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 2453 | 2616 | 2616 | 0 | 3223 |
| /knowledge/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 528 | 672 | 672 | 0 | 1170 |
| /launchpad/speed-test | anon | 200 | /login | 0 | 0 | 0 | 8 | 3 | 3 | 90 | 4861 | 412 | 556 | 556 | 0 | never |
| /legal/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 2897 | 3204 | 3204 | 0 | 3783 |
| /libraries/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13578 | 914 | 1112 | 1112 | 0 | 1837 |
| /make/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 660 | 784 | 784 | 0 | 1275 |
| /mandates/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 640 | 840 | 840 | 0 | 1317 |
| /maps/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 250 | 13569 | 842 | 980 | 980 | 0 | 1496 |
| /markdown-studio/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 679 | 872 | 872 | 0 | 1477 |
| /marketing/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 255 | 14447 | 2590 | 2804 | 2804 | 0 | 3306 |
| /masterwork/speed-test | anon | 200 | /login | 0 | 0 | 0 | 8 | 3 | 3 | 90 | 4861 | 3041 | 3224 | 3224 | 0 | never |
| /medical/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13574 | 924 | 1116 | 1116 | 0 | 1775 |
| /meetings/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 730 | 856 | 856 | 0 | 1490 |
| /messages/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 254 | 13735 | 3542 | 3732 | 3732 | 0 | 4421 |
| /messenger/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 249 | 13577 | 702 | 924 | 924 | 0 | 1822 |
| /notes/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 273 | 15818 | 961 | 1104 | 1104 | 0 | 1678 |
| /notifications/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 582 | 704 | 704 | 0 | 1293 |
| /organizations/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 251 | 13577 | 2978 | 3312 | 3312 | 0 | 3876 |
| /pick-lists/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 736 | 904 | 904 | 0 | 1409 |
| /podcast/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13574 | 1604 | 1796 | 1796 | 0 | 2407 |
| /presentations/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 249 | 13578 | 3949 | 4152 | 4152 | 0 | 4766 |
| /print/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 250 | 13578 | 859 | 1088 | 1088 | 0 | 1642 |
| /projects/speed-test | anon | 200 | /login | 0 | 0 | 0 | 8 | 3 | 3 | 90 | 4861 | 377 | 496 | 496 | 0 | never |
| /rag/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 2989 | 3120 | 3120 | 0 | 3662 |
| /reports/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 3914 | 4112 | 4112 | 0 | 4592 |
| /research/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 251 | 13585 | 964 | 1120 | 1120 | 0 | 1623 |
| /sandbox/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 249 | 13577 | 787 | 1124 | 1124 | 0 | 1758 |
| /schedules/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 250 | 13569 | 648 | 804 | 804 | 0 | 1320 |
| /scopes/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 249 | 13577 | 528 | 764 | 764 | 0 | 1354 |
| /scraper/speed-test | anon | 200 | /login | 0 | 0 | 0 | 8 | 3 | 3 | 90 | 4861 | 352 | 528 | 528 | 0 | never |
| /search/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 249 | 13577 | 792 | 1096 | 1096 | 0 | 1637 |
| /shapes/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 700 | 872 | 872 | 0 | 1468 |
| /spaces/speed-test | anon | 200 |  | 2 | 0 | 0 | 7 | 0 | 2 | 273 | 17109 | 1274 | 1612 | 1612 | 0 | 2231 |
| /staff/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 3 | 250 | 13569 | 820 | 964 | 964 | 0 | 1505 |
| /suggestions/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 661 | 800 | 800 | 0 | 1340 |
| /surfaces/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 250 | 13569 | 515 | 652 | 652 | 0 | 1164 |
| /tasks/speed-test | anon | 200 | /login | 0 | 0 | 0 | 8 | 3 | 3 | 90 | 4861 | 353 | 548 | 548 | 0 | never |
| /tools/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 820 | 1260 | 1260 | 0 | 2114 |
| /transcripts/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 537 | 740 | 740 | 0 | 1361 |
| /trash/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 728 | 920 | 920 | 0 | 1484 |
| /user-settings/speed-test | anon | 200 |  | 4 | 0 | 0 | 35 | 0 | 10 | 282 | 16307 | 718 | 1016 | 1016 | 0 | 1587 |
| /vault/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 2524 | 2708 | 2708 | 0 | 3218 |
| /voice/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 4199 | 4400 | 4400 | 0 | 5045 |
| /war-room/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 525 | 704 | 704 | 0 | 1257 |
| /welcome/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 779 | 916 | 916 | 0 | 1521 |
| /work/speed-test | anon | 200 |  | 0 | 0 | 0 | 11 | 0 | 3 | 251 | 13586 | 692 | 836 | 836 | 0 | 1396 |
| /workbooks/speed-test | anon | 200 |  | 0 | 0 | 0 | 9 | 0 | 2 | 249 | 13578 | 723 | 952 | 952 | 0 | 1450 |
| /workflows/speed-test | anon | 200 |  | 0 | 0 | 0 | 3 | 0 | 0 | 249 | 13566 | 2998 | 3156 | 3156 | 0 | 3818 |

### /speed-test — anon

final path `/speed-test` · settled +1474ms · TTFB 641ms (103 at 253ms) · FCP 784ms · LCP 784ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | before | next doc | GET | /speed-test?trace=load | 641 | 24148 | 200 |  | other |
| 2 | 1478 | after | next | POST | /api/set-theme | 147 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3551 | after | next | POST | /api/diagnostics/client-error | 300 | 154 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7577 | after | next | POST | /api/acquisition/first-touch | 186 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /acquisition/speed-test — anon

final path `/acquisition/speed-test` · settled +1967ms · TTFB 1211ms (103 at 103ms) · FCP 1432ms · LCP 1432ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /acquisition/speed-test?trace=load | 1380 | 24389 | 200 |  | other |
| 2 | 1977 | after | next | POST | /api/set-theme | 141 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 4043 | after | next | POST | /api/diagnostics/client-error | 217 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 8125 | after | next | POST | /api/acquisition/first-touch | 161 | 158 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /administration/speed-test — anon

final path `/login` · settled +neverms · TTFB 2705ms (103 at 965ms) · FCP 2828ms · LCP 2828ms · CLS 0 · JS 92 files / 4964 KB (1593 KB wire) · static assets 99

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 933 | ? | 3p | GET | manage.aimatrx.com/login?redirectTo=/administration/speed-test?trace=load | 1847 | 14572 | 200 |  | other |
| 2 | 3018 | ? | 3p | GET | manage.aimatrx.com/sign-up?redirectTo=/administration/speed-test?trace=load | 478 | 324 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 3018 | ? | 3p | GET | manage.aimatrx.com/forgot-password?redirectTo=/administration/speed-test?trace=load | 282 | 420 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 3128 | ? | 3p | GET | manage.aimatrx.com/login?redirectTo=/administration | 164 | 519 | 200 | ×3 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 3294 | ? | 3p | GET | manage.aimatrx.com/login?redirectTo=/administration | 148 | 317 | 200 | ×3 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 3303 | ? | 3p | GET | manage.aimatrx.com/forgot-password?redirectTo=/administration/speed-test?trace=load | 463 | 2089 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 7 | 3325 | ? | 3p | GET | google.com/.well-known/web-identity | 235 | 532 | 200 |  | FedCM |
| 8 | 3325 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 127 | 396 | 200 |  | FedCM |
| 9 | 3443 | ? | 3p | GET | manage.aimatrx.com/login?redirectTo=/administration | 143 | 2024 | 200 | ×3 | globalThis.fetch@03zp-id3x7p3z |
| 10 | 3497 | ? | 3p | GET | manage.aimatrx.com/sign-up?redirectTo=/administration/speed-test?trace=load | 176 | 2050 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 11 | 3560 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 86 | 115 | 200 |  | FedCM |
| 12 | 3675 | ? | 3p | GET | manage.aimatrx.com/sign-up | 141 | 290 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 13 | 3767 | ? | 3p | GET | manage.aimatrx.com/forgot-password | 178 | 264 | 200 |  | globalThis.fetch@03zp-id3x7p3z |

### /agent-connections/speed-test — anon

final path `/agent-connections/speed-test` · settled +1658ms · TTFB 876ms (103 at 156ms) · FCP 1068ms · LCP 1068ms · CLS 0 · JS 250 files / 13600 KB (4319 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /agent-connections/speed-test?trace=load | 939 | 25099 | 200 |  | other |
| 2 | 1653 | before | next rsc | GET | /login?redirectTo=/agent-connections/speed-test?trace=load | 333 | 322 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1653 | before | next rsc | GET | /sign-up?redirectTo=/agent-connections/speed-test?trace=load | 133 | 587 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1653 | before | next rsc | GET | /features | 166 | 303 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1664 | after | next | POST | /api/set-theme | 117 | 263 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1788 | after | next rsc | GET | /sign-up?redirectTo=/agent-connections/speed-test?trace=load | 154 | 2387 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1820 | after | next rsc | GET | /features | 148 | 2254 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1944 | after | next rsc | GET | /sign-up | 132 | 281 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 1987 | after | next rsc | GET | /login?redirectTo=/agent-connections/speed-test?trace=load | 151 | 2111 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 2138 | after | next rsc | GET | /login | 131 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3746 | after | next | POST | /api/diagnostics/client-error | 241 | 192 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 7798 | after | next | POST | /api/acquisition/first-touch | 1184 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /agents/speed-test — anon

final path `/agents/speed-test` · settled +1394ms · TTFB 762ms (103 at 100ms) · FCP 888ms · LCP 888ms · CLS 0 · JS 251 files / 13585 KB (4314 KB wire) · static assets 260

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /agents/speed-test?trace=load | 846 | 24439 | 200 |  | other |
| 2 | 1398 | after | next | POST | /api/set-theme | 155 | 245 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3407 | after | next | POST | /api/diagnostics/client-error | 376 | 154 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7482 | after | next | POST | /api/acquisition/first-touch | 192 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /applets/speed-test — anon

final path `/applets/speed-test` · settled +1394ms · TTFB 712ms (103 at 103ms) · FCP 832ms · LCP 832ms · CLS 0 · JS 250 files / 13573 KB (4309 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /applets/speed-test?trace=load | 720 | 24309 | 200 |  | other |
| 2 | 1398 | after | next | POST | /api/set-theme | 120 | 235 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3423 | after | next | POST | /api/diagnostics/client-error | 217 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7489 | after | next | POST | /api/acquisition/first-touch | 160 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /approvals/speed-test — anon

final path `/approvals/speed-test` · settled +1580ms · TTFB 885ms (103 at 105ms) · FCP 1124ms · LCP 1124ms · CLS 0 · JS 250 files / 13574 KB (4309 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /approvals/speed-test?trace=load | 962 | 24109 | 200 |  | other |
| 2 | 1587 | after | next | POST | /api/set-theme | 113 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3610 | after | next | POST | /api/diagnostics/client-error | 319 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7673 | after | next | POST | /api/acquisition/first-touch | 270 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /artifacts/speed-test — anon

final path `/artifacts/speed-test` · settled +1512ms · TTFB 700ms (103 at 178ms) · FCP 948ms · LCP 948ms · CLS 0 · JS 250 files / 13569 KB (4307 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /artifacts/speed-test?trace=load | 814 | 25098 | 200 |  | other |
| 2 | 1505 | before | next rsc | GET | /login?redirectTo=/artifacts/speed-test?trace=load | 166 | 385 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1505 | before | next rsc | GET | /sign-up?redirectTo=/artifacts/speed-test?trace=load | 476 | 350 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1505 | before | next rsc | GET | /features | 165 | 494 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1528 | after | next | POST | /api/set-theme | 143 | 238 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1673 | after | next rsc | GET | /features | 190 | 2250 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1676 | after | next rsc | GET | /login?redirectTo=/artifacts/speed-test?trace=load | 187 | 2344 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1864 | after | next rsc | GET | /login | 138 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 1982 | after | next rsc | GET | /sign-up?redirectTo=/artifacts/speed-test?trace=load | 213 | 2132 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 2196 | after | next rsc | GET | /sign-up | 191 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3599 | after | next | POST | /api/diagnostics/client-error | 221 | 192 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 7677 | after | next | POST | /api/acquisition/first-touch | 164 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /board/speed-test — anon

final path `/board/speed-test` · settled +1341ms · TTFB 651ms (103 at 183ms) · FCP 816ms · LCP 816ms · CLS 0 · JS 250 files / 13571 KB (4308 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | before | next doc | GET | /board/speed-test?trace=load | 652 | 24608 | 200 |  | other |
| 2 | 1347 | after | next | POST | /api/set-theme | 125 | 238 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3368 | after | next | POST | /api/diagnostics/client-error | 244 | 204 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7452 | after | next | POST | /api/acquisition/first-touch | 169 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /camera/speed-test — anon

final path `/camera/speed-test` · settled +1488ms · TTFB 799ms (103 at 96ms) · FCP 968ms · LCP 968ms · CLS 0 · JS 250 files / 13573 KB (4309 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /camera/speed-test?trace=load | 927 | 24713 | 200 |  | other |
| 2 | 1494 | after | next | POST | /api/set-theme | 114 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3548 | after | next | POST | /api/diagnostics/client-error | 221 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7581 | after | next | POST | /api/acquisition/first-touch | 172 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /chat/speed-test — anon

final path `/chat/speed-test` · settled +984ms · TTFB 363ms (103 at 111ms) · FCP 496ms · LCP 496ms · CLS 0 · JS 251 files / 13574 KB (4310 KB wire) · static assets 260

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /chat/speed-test?trace=load | 447 | 24412 | 200 |  | other |
| 2 | 992 | after | next | POST | /api/set-theme | 114 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3035 | after | next | POST | /api/diagnostics/client-error | 319 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7088 | after | next | POST | /api/acquisition/first-touch | 185 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /cms/speed-test — anon

final path `/cms/speed-test` · settled +3667ms · TTFB 2929ms (103 at 100ms) · FCP 3120ms · LCP 3120ms · CLS 0 · JS 250 files / 13569 KB (4307 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /cms/speed-test?trace=load | 3071 | 25307 | 200 |  | other |
| 2 | 3661 | before | next rsc | GET | /login?redirectTo=/cms/speed-test?trace=load | 154 | 375 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3661 | before | next rsc | GET | /sign-up?redirectTo=/cms/speed-test?trace=load | 159 | 349 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 3661 | before | next rsc | GET | /features | 145 | 504 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 3673 | after | next | POST | /api/set-theme | 120 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 3808 | after | next rsc | GET | /features | 131 | 2243 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 3815 | after | next rsc | GET | /login?redirectTo=/cms/speed-test?trace=load | 144 | 2066 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 3821 | after | next rsc | GET | /sign-up?redirectTo=/cms/speed-test?trace=load | 143 | 2088 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3961 | after | next rsc | GET | /login | 137 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 3965 | after | next rsc | GET | /sign-up | 154 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 5705 | after | next | POST | /api/diagnostics/client-error | 554 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 9756 | after | next | POST | /api/acquisition/first-touch | 176 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /code/speed-test — anon

final path `/code/speed-test` · settled +3955ms · TTFB 3130ms (103 at 105ms) · FCP 3284ms · LCP 3284ms · CLS 0 · JS 251 files / 13575 KB (4310 KB wire) · static assets 260

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /code/speed-test?trace=load | 3262 | 24909 | 200 |  | other |
| 2 | 3961 | after | next | POST | /api/set-theme | 148 | 238 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 6146 | after | next | POST | /api/diagnostics/client-error | 368 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 10148 | after | next | POST | /api/acquisition/first-touch | 255 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /context-items/speed-test — anon

final path `/context-items/speed-test` · settled +1870ms · TTFB 970ms (103 at 185ms) · FCP 1252ms · LCP 1252ms · CLS 0 · JS 250 files / 13569 KB (4307 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /context-items/speed-test?trace=load | 1201 | 25145 | 200 |  | other |
| 2 | 1864 | before | next rsc | GET | /login?redirectTo=/context-items/speed-test?trace=load | 359 | 347 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1864 | before | next rsc | GET | /sign-up?redirectTo=/context-items/speed-test?trace=load | 157 | 393 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1864 | before | next rsc | GET | /features | 152 | 498 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1875 | after | next | POST | /api/set-theme | 122 | 258 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 2018 | after | next rsc | GET | /features | 199 | 2217 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 2022 | after | next rsc | GET | /sign-up?redirectTo=/context-items/speed-test?trace=load | 195 | 2076 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 2218 | after | next rsc | GET | /sign-up | 188 | 375 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 2224 | after | next rsc | GET | /login?redirectTo=/context-items/speed-test?trace=load | 182 | 2102 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 2407 | after | next rsc | GET | /login | 140 | 347 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3950 | after | next | POST | /api/diagnostics/client-error | 360 | 182 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 7971 | after | next | POST | /api/acquisition/first-touch | 203 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /crm/speed-test — anon

final path `/crm/speed-test` · settled +3325ms · TTFB 2530ms (103 at 184ms) · FCP 2728ms · LCP 2728ms · CLS 0 · JS 250 files / 13573 KB (4309 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /crm/speed-test?trace=load | 2683 | 24822 | 200 |  | other |
| 2 | 3329 | after | next | POST | /api/set-theme | 192 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 5393 | after | next | POST | /api/diagnostics/client-error | 265 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 9411 | after | next | POST | /api/acquisition/first-touch | 213 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /dashboard/speed-test — anon

final path `/login` · settled +neverms · TTFB 302ms (103 at 168ms) · FCP 532ms · LCP 532ms · CLS 0 · JS 90 files / 4861 KB (1555 KB wire) · static assets 97

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 136 | ? | next doc | GET | /login?redirectTo=/dashboard/speed-test?trace=load | 175 | 14169 | 200 |  | other |
| 2 | 832 | ? | next rsc | GET | / | 175 | 455 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 832 | ? | next rsc | GET | /sign-up?redirectTo=/dashboard/speed-test?trace=load | 175 | 390 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 832 | ? | next rsc | GET | /forgot-password?redirectTo=/dashboard/speed-test?trace=load | 177 | 350 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 1009 | ? | next rsc | GET | / | 129 | 1782 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 1010 | ? | next rsc | GET | /sign-up?redirectTo=/dashboard/speed-test?trace=load | 151 | 2069 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 7 | 1010 | ? | next rsc | GET | /forgot-password?redirectTo=/dashboard/speed-test?trace=load | 136 | 2070 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 8 | 1139 | ? | 3p | GET | google.com/.well-known/web-identity | 232 | 532 | 200 |  | FedCM |
| 9 | 1139 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 204 | 396 | 200 |  | FedCM |
| 10 | 1147 | ? | next rsc | GET | /forgot-password | 195 | 262 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 11 | 1162 | ? | next rsc | GET | /sign-up | 180 | 285 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 12 | 1371 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 164 | 115 | 200 |  | FedCM |

### /data/speed-test — anon

final path `/data/speed-test` · settled +1683ms · TTFB 946ms (103 at 98ms) · FCP 1144ms · LCP 1144ms · CLS 0 · JS 249 files / 13577 KB (4310 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /data/speed-test?trace=load | 1088 | 30302 | 200 |  | other |
| 2 | 1674 | before | next rsc | GET | /sign-up?source=tables-landing&redirectTo=/data | 143 | 558 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1674 | before | next rsc | GET | /login?redirectTo=/data | 146 | 342 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1688 | after | next | POST | /api/set-theme | 124 | 267 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1818 | after | next rsc | GET | /sign-up?source=tables-landing&redirectTo=/data | 149 | 2171 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1821 | after | next rsc | GET | /login?redirectTo=/data | 143 | 2305 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1965 | after | next rsc | GET | /login | 126 | 301 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1968 | after | next rsc | GET | /sign-up | 132 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3762 | after | next | POST | /api/diagnostics/client-error | 229 | 196 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7798 | after | next | POST | /api/acquisition/first-touch | 861 | 160 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /decisions/speed-test — anon

final path `/decisions/speed-test` · settled +3053ms · TTFB 727ms (103 at 176ms) · FCP 928ms · LCP 928ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /decisions/speed-test?trace=load | 745 | 24267 | 200 |  | other |
| 2 | 3058 | after | next | POST | /api/set-theme | 236 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 5355 | after | next | POST | /api/diagnostics/client-error | 249 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 9370 | after | next | POST | /api/acquisition/first-touch | 213 | 166 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /detail/speed-test — anon

final path `/login` · settled +neverms · TTFB 673ms (103 at 238ms) · FCP 816ms · LCP 816ms · CLS 0 · JS 90 files / 4861 KB (1555 KB wire) · static assets 97

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 208 | ? | next doc | GET | /login?redirectTo=/detail/speed-test?trace=load | 544 | 14106 | 200 |  | other |
| 2 | 1104 | ? | next rsc | GET | / | 190 | 283 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 1104 | ? | next rsc | GET | /sign-up?redirectTo=/detail/speed-test?trace=load | 191 | 373 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 1104 | ? | next rsc | GET | /forgot-password?redirectTo=/detail/speed-test?trace=load | 179 | 531 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 1285 | ? | next rsc | GET | /forgot-password?redirectTo=/detail/speed-test?trace=load | 196 | 2105 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 1294 | ? | next rsc | GET | / | 189 | 1813 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 7 | 1296 | ? | next rsc | GET | /sign-up?redirectTo=/detail/speed-test?trace=load | 189 | 2087 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 8 | 1409 | ? | 3p | GET | google.com/.well-known/web-identity | 283 | 532 | 200 |  | FedCM |
| 9 | 1409 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 264 | 396 | 200 |  | FedCM |
| 10 | 1483 | ? | next rsc | GET | /forgot-password | 190 | 282 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 11 | 1485 | ? | next rsc | GET | /sign-up | 188 | 257 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 12 | 1692 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 79 | 115 | 200 |  | FedCM |

### /devices/speed-test — anon

final path `/devices/speed-test` · settled +1369ms · TTFB 671ms (103 at 129ms) · FCP 852ms · LCP 852ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /devices/speed-test?trace=load | 730 | 24466 | 200 |  | other |
| 2 | 1376 | after | next | POST | /api/set-theme | 133 | 250 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3409 | after | next | POST | /api/diagnostics/client-error | 250 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7490 | after | next | POST | /api/acquisition/first-touch | 200 | 163 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /dictionary/speed-test — anon

final path `/dictionary/speed-test` · settled +1277ms · TTFB 605ms (103 at 100ms) · FCP 732ms · LCP 732ms · CLS 0 · JS 250 files / 13574 KB (4309 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /dictionary/speed-test?trace=load | 608 | 24200 | 200 |  | other |
| 2 | 1282 | after | next | POST | /api/set-theme | 117 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3303 | after | next | POST | /api/diagnostics/client-error | 234 | 193 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7379 | after | next | POST | /api/acquisition/first-touch | 160 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /documents/speed-test — anon

final path `/documents/speed-test` · settled +1364ms · TTFB 743ms (103 at 128ms) · FCP 900ms · LCP 900ms · CLS 0 · JS 249 files / 13578 KB (4310 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /documents/speed-test?trace=load | 829 | 30740 | 200 |  | other |
| 2 | 1361 | before | next rsc | GET | /sign-up?source=documents-landing&redirectTo=/documents | 147 | 580 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1361 | before | next rsc | GET | /login?redirectTo=/documents | 155 | 343 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1372 | after | next | POST | /api/set-theme | 118 | 263 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1509 | after | next rsc | GET | /sign-up?source=documents-landing&redirectTo=/documents | 150 | 2064 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1516 | after | next rsc | GET | /login?redirectTo=/documents | 128 | 2044 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1646 | after | next rsc | GET | /login | 158 | 302 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1660 | after | next rsc | GET | /sign-up | 144 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3439 | after | next | POST | /api/diagnostics/client-error | 248 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7461 | after | next | POST | /api/acquisition/first-touch | 351 | 158 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /drive/speed-test — anon

final path `/drive/speed-test` · settled +1224ms · TTFB 468ms (103 at 103ms) · FCP 712ms · LCP 712ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /drive/speed-test?trace=load | 600 | 24206 | 200 |  | other |
| 2 | 1229 | after | next | POST | /api/set-theme | 131 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3216 | after | next | POST | /api/diagnostics/client-error | 248 | 145 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7313 | after | next | POST | /api/acquisition/first-touch | 170 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /education/speed-test — anon

final path `/education/speed-test` · settled +5389ms · TTFB 4618ms (103 at 114ms) · FCP 4780ms · LCP 4780ms · CLS 0 · JS 255 files / 13667 KB (4344 KB wire) · static assets 264

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /education/speed-test?trace=load | 4711 | 27455 | 200 |  | other |
| 2 | 5395 | after | next | POST | /api/set-theme | 131 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 7443 | after | next | POST | /api/diagnostics/client-error | 206 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 11511 | after | next | POST | /api/acquisition/first-touch | 178 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /esign/speed-test — anon

final path `/esign/speed-test` · settled +1284ms · TTFB 587ms (103 at 97ms) · FCP 788ms · LCP 788ms · CLS 0 · JS 250 files / 13569 KB (4307 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /esign/speed-test?trace=load | 729 | 25012 | 200 |  | other |
| 2 | 1278 | before | next rsc | GET | /login?redirectTo=/esign/speed-test?trace=load | 162 | 570 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1278 | before | next rsc | GET | /sign-up?redirectTo=/esign/speed-test?trace=load | 139 | 573 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1278 | before | next rsc | GET | /features | 140 | 267 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1291 | after | next | POST | /api/set-theme | 141 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1420 | after | next rsc | GET | /sign-up?redirectTo=/esign/speed-test?trace=load | 164 | 2108 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1421 | after | next rsc | GET | /features | 186 | 2225 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1451 | after | next rsc | GET | /login?redirectTo=/esign/speed-test?trace=load | 156 | 2089 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 1586 | after | next rsc | GET | /sign-up | 164 | 298 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 1607 | after | next rsc | GET | /login | 182 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3299 | after | next | POST | /api/diagnostics/client-error | 291 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 7387 | after | next | POST | /api/acquisition/first-touch | 207 | 156 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /exports/speed-test — anon

final path `/exports/speed-test` · settled +1230ms · TTFB 540ms (103 at 106ms) · FCP 692ms · LCP 692ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /exports/speed-test?trace=load | 545 | 24235 | 200 |  | other |
| 2 | 1237 | after | next | POST | /api/set-theme | 185 | 251 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3340 | after | next | POST | /api/diagnostics/client-error | 286 | 154 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7344 | after | next | POST | /api/acquisition/first-touch | 211 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /features/speed-test — anon

final path `/features/speed-test` · settled +1471ms · TTFB 581ms (103 at 95ms) · FCP 756ms · LCP 756ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /features/speed-test?trace=load | 651 | 24199 | 200 |  | other |
| 2 | 1475 | after | next | POST | /api/set-theme | 119 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3501 | after | next | POST | /api/diagnostics/client-error | 356 | 204 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7555 | after | next | POST | /api/acquisition/first-touch | 177 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /files/speed-test — anon

final path `/files/speed-test` · settled +3495ms · TTFB 2742ms (103 at 97ms) · FCP 2936ms · LCP 2936ms · CLS 0 · JS 251 files / 13585 KB (4314 KB wire) · static assets 260

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /files/speed-test?trace=load | 2873 | 25093 | 200 |  | other |
| 2 | 3500 | after | next | POST | /api/set-theme | 123 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 5501 | after | next | POST | /api/diagnostics/client-error | 238 | 214 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 9592 | after | next | POST | /api/acquisition/first-touch | 183 | 148 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /hr/speed-test — anon

final path `/login` · settled +neverms · TTFB 325ms (103 at 181ms) · FCP 448ms · LCP 448ms · CLS 0 · JS 90 files / 4861 KB (1555 KB wire) · static assets 97

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 154 | ? | next doc | GET | /login?redirectTo=/hr/speed-test?trace=load | 174 | 14134 | 200 |  | other |
| 2 | 734 | ? | next rsc | GET | / | 190 | 465 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 734 | ? | next rsc | GET | /sign-up?redirectTo=/hr/speed-test?trace=load | 677 | 377 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 734 | ? | next rsc | GET | /forgot-password?redirectTo=/hr/speed-test?trace=load | 320 | 344 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 926 | ? | next rsc | GET | / | 137 | 1812 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 1041 | ? | 3p | GET | google.com/.well-known/web-identity | 248 | 532 | 200 |  | FedCM |
| 7 | 1041 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 125 | 396 | 200 |  | FedCM |
| 8 | 1056 | ? | next rsc | GET | /forgot-password?redirectTo=/hr/speed-test?trace=load | 164 | 2067 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 9 | 1222 | ? | next rsc | GET | /forgot-password | 146 | 244 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 10 | 1289 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 95 | 114 | 200 |  | FedCM |
| 11 | 1412 | ? | next rsc | GET | /sign-up?redirectTo=/hr/speed-test?trace=load | 143 | 2083 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 12 | 1556 | ? | next rsc | GET | /sign-up | 132 | 281 | 200 |  | globalThis.fetch@03zp-id3x7p3z |

### /images/speed-test — anon

final path `/images/speed-test` · settled +1265ms · TTFB 634ms (103 at 104ms) · FCP 772ms · LCP 772ms · CLS 0 · JS 252 files / 13599 KB (4320 KB wire) · static assets 261

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /images/speed-test?trace=load | 717 | 26600 | 200 |  | other |
| 2 | 1263 | before | next rsc | GET | /images/upload | 149 | 506 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1271 | after | next | POST | /api/set-theme | 122 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1414 | after | next rsc | GET | /images/upload | 263 | 2519 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1427 | after | next rsc | GET | /images | 1988 | 271 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1427 | after | next rsc | GET | /images/manager | 533 | 292 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1427 | after | next rsc | GET | /images/public-search | 1918 | 332 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1679 | after | next rsc | GET | /images/my-cloud | 1658 | 345 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 1961 | after | next rsc | GET | /images/all-files | 946 | 344 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 2908 | after | next rsc | GET | /images/branded | 2052 | 305 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3316 | after | next | POST | /api/diagnostics/client-error | 219 | 160 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 3337 | after | next rsc | GET | /images/tools | 312 | 286 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 13 | 3346 | after | next rsc | GET | /images/studio | 349 | 288 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 14 | 3416 | after | next rsc | GET | /images/studio-light | 349 | 309 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 15 | 3651 | after | next rsc | GET | /images/studio-library | 285 | 309 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 16 | 3695 | after | next rsc | GET | /images/ai-generate | 334 | 293 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 17 | 3766 | after | next rsc | GET | /images/generate | 1837 | 292 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 18 | 3936 | after | next rsc | GET | /images/edit | 408 | 497 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 19 | 4030 | after | next rsc | GET | /images/annotate | 1706 | 292 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 20 | 4346 | after | next rsc | GET | /images/avatar | 359 | 311 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 21 | 4705 | after | next rsc | GET | /images/convert | 422 | 298 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 22 | 4962 | after | next rsc | GET | /images/from-base64 | 395 | 307 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 23 | 5128 | after | next rsc | GET | /images/presets | 307 | 319 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 24 | 5358 | after | next rsc | GET | /images/library | 330 | 292 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 25 | 5438 | after | next rsc | GET | /images | 323 | 1933 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 26 | 5604 | after | next rsc | GET | /images/manager | 304 | 2255 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 27 | 5688 | after | next rsc | GET | /images/public-search | 137 | 2535 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 28 | 5737 | after | next rsc | GET | /images/my-cloud | 312 | 2381 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 29 | 5762 | after | next rsc | GET | /images/all-files | 287 | 2102 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 30 | 5826 | after | next rsc | GET | /images/branded | 139 | 2402 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 31 | 5908 | after | next rsc | GET | /images/tools | 305 | 2468 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 32 | 5965 | after | next rsc | GET | /images/studio | 145 | 2397 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 33 | 6050 | after | next rsc | GET | /images/studio-light | 277 | 2493 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 34 | 6051 | after | next rsc | GET | /images/studio-library | 308 | 2434 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 35 | 6111 | after | next rsc | GET | /images/ai-generate | 295 | 2330 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 36 | 6214 | after | next rsc | GET | /images/generate | 361 | 2293 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 37 | 6328 | after | next rsc | GET | /images/edit | 310 | 2128 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 38 | 6360 | after | next rsc | GET | /images/annotate | 293 | 2094 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 39 | 6407 | after | next rsc | GET | /images/avatar | 139 | 2140 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 40 | 6547 | after | next rsc | GET | /images/convert | 373 | 4968 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 41 | 6576 | after | next rsc | GET | /images/from-base64 | 184 | 4920 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 42 | 6639 | after | next rsc | GET | /images/presets | 351 | 5037 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 43 | 6654 | after | next rsc | GET | /images/library | 159 | 1979 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 44 | 7376 | after | next | POST | /api/acquisition/first-touch | 158 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /knowledge-graph/speed-test — anon

final path `/knowledge-graph/speed-test` · settled +3223ms · TTFB 2453ms (103 at 96ms) · FCP 2616ms · LCP 2616ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /knowledge-graph/speed-test?trace=load | 2588 | 24815 | 200 |  | other |
| 2 | 3229 | after | next | POST | /api/set-theme | 118 | 250 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 5336 | after | next | POST | /api/diagnostics/client-error | 249 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 9334 | after | next | POST | /api/acquisition/first-touch | 194 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /knowledge/speed-test — anon

final path `/knowledge/speed-test` · settled +1170ms · TTFB 528ms (103 at 97ms) · FCP 672ms · LCP 672ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /knowledge/speed-test?trace=load | 614 | 24033 | 200 |  | other |
| 2 | 1175 | after | next | POST | /api/set-theme | 129 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3189 | after | next | POST | /api/diagnostics/client-error | 217 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7264 | after | next | POST | /api/acquisition/first-touch | 168 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /launchpad/speed-test — anon

final path `/login` · settled +neverms · TTFB 412ms (103 at 177ms) · FCP 556ms · LCP 556ms · CLS 0 · JS 90 files / 4861 KB (1555 KB wire) · static assets 97

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 149 | ? | next doc | GET | /login?redirectTo=/launchpad/speed-test?trace=load | 358 | 14460 | 200 |  | other |
| 2 | 858 | ? | next rsc | GET | / | 188 | 255 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 858 | ? | next rsc | GET | /sign-up?redirectTo=/launchpad/speed-test?trace=load | 166 | 408 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 858 | ? | next rsc | GET | /forgot-password?redirectTo=/launchpad/speed-test?trace=load | 141 | 533 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 1000 | ? | next rsc | GET | /forgot-password?redirectTo=/launchpad/speed-test?trace=load | 134 | 2102 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 1024 | ? | next rsc | GET | /sign-up?redirectTo=/launchpad/speed-test?trace=load | 168 | 2060 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 7 | 1046 | ? | next rsc | GET | / | 141 | 1816 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 8 | 1136 | ? | next rsc | GET | /forgot-password | 135 | 262 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 9 | 1163 | ? | 3p | GET | google.com/.well-known/web-identity | 157 | 532 | 200 |  | FedCM |
| 10 | 1163 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 114 | 396 | 200 |  | FedCM |
| 11 | 1193 | ? | next rsc | GET | /sign-up | 246 | 284 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 12 | 1320 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 90 | 115 | 200 |  | FedCM |

### /legal/speed-test — anon

final path `/legal/speed-test` · settled +3783ms · TTFB 2897ms (103 at 100ms) · FCP 3204ms · LCP 3204ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /legal/speed-test?trace=load | 3017 | 24819 | 200 |  | other |
| 2 | 3789 | after | next | POST | /api/set-theme | 192 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 5929 | after | next | POST | /api/diagnostics/client-error | 365 | 199 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 9966 | after | next | POST | /api/acquisition/first-touch | 189 | 148 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /libraries/speed-test — anon

final path `/libraries/speed-test` · settled +1837ms · TTFB 914ms (103 at 91ms) · FCP 1112ms · LCP 1112ms · CLS 0 · JS 250 files / 13578 KB (4311 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /libraries/speed-test?trace=load | 1032 | 24327 | 200 |  | other |
| 2 | 1843 | after | next | POST | /api/set-theme | 121 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3870 | after | next | POST | /api/diagnostics/client-error | 271 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7959 | after | next | POST | /api/acquisition/first-touch | 190 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /make/speed-test — anon

final path `/make/speed-test` · settled +1275ms · TTFB 660ms (103 at 105ms) · FCP 784ms · LCP 784ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /make/speed-test?trace=load | 666 | 24549 | 200 |  | other |
| 2 | 1281 | after | next | POST | /api/set-theme | 123 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3324 | after | next | POST | /api/diagnostics/client-error | 292 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7387 | after | next | POST | /api/acquisition/first-touch | 191 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /mandates/speed-test — anon

final path `/mandates/speed-test` · settled +1317ms · TTFB 640ms (103 at 100ms) · FCP 840ms · LCP 840ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /mandates/speed-test?trace=load | 799 | 24210 | 200 |  | other |
| 2 | 1322 | after | next | POST | /api/set-theme | 118 | 271 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3398 | after | next | POST | /api/diagnostics/client-error | 253 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7426 | after | next | POST | /api/acquisition/first-touch | 187 | 170 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /maps/speed-test — anon

final path `/maps/speed-test` · settled +1496ms · TTFB 842ms (103 at 118ms) · FCP 980ms · LCP 980ms · CLS 0 · JS 250 files / 13569 KB (4307 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /maps/speed-test?trace=load | 923 | 25053 | 200 |  | other |
| 2 | 1489 | before | next rsc | GET | /login?redirectTo=/maps/speed-test?trace=load | 161 | 315 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1489 | before | next rsc | GET | /sign-up?redirectTo=/maps/speed-test?trace=load | 138 | 566 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1489 | before | next rsc | GET | /features | 146 | 309 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1501 | after | next | POST | /api/set-theme | 112 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1629 | after | next rsc | GET | /sign-up?redirectTo=/maps/speed-test?trace=load | 256 | 2079 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1637 | after | next rsc | GET | /features | 222 | 2228 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1651 | after | next rsc | GET | /login?redirectTo=/maps/speed-test?trace=load | 133 | 2301 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 1786 | after | next rsc | GET | /login | 142 | 258 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 1886 | after | next rsc | GET | /sign-up | 128 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3541 | after | next | POST | /api/diagnostics/client-error | 4790 | 113 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 7592 | after | next | POST | /api/acquisition/first-touch | 731 | 211 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /markdown-studio/speed-test — anon

final path `/markdown-studio/speed-test` · settled +1477ms · TTFB 679ms (103 at 102ms) · FCP 872ms · LCP 872ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /markdown-studio/speed-test?trace=load | 830 | 24434 | 200 |  | other |
| 2 | 1484 | after | next | POST | /api/set-theme | 122 | 267 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3482 | after | next | POST | /api/diagnostics/client-error | 251 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7577 | after | next | POST | /api/acquisition/first-touch | 203 | 148 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /marketing/speed-test — anon

final path `/marketing/speed-test` · settled +3306ms · TTFB 2590ms (103 at 99ms) · FCP 2804ms · LCP 2804ms · CLS 0 · JS 255 files / 14447 KB (4539 KB wire) · static assets 264

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /marketing/speed-test?trace=load | 2738 | 31466 | 200 |  | other |
| 2 | 3296 | before | next rsc | GET | /sign-up?source=marketing-landing&redirectTo=/marketing | 136 | 570 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3296 | before | next rsc | GET | /login?redirectTo=/marketing | 154 | 346 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 3333 | after | next | POST | /api/set-theme | 117 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 3433 | after | next rsc | GET | /sign-up?source=marketing-landing&redirectTo=/marketing | 140 | 2355 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 3451 | after | next rsc | GET | /login?redirectTo=/marketing | 144 | 2078 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 3575 | after | next rsc | GET | /sign-up | 145 | 287 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 3596 | after | next rsc | GET | /login | 136 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 5327 | after | next | POST | /api/diagnostics/client-error | 276 | 192 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 9415 | after | next | POST | /api/acquisition/first-touch | 193 | 163 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /masterwork/speed-test — anon

final path `/login` · settled +neverms · TTFB 3041ms (103 at 2862ms) · FCP 3224ms · LCP 3224ms · CLS 0 · JS 90 files / 4861 KB (1555 KB wire) · static assets 97

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2826 | ? | next doc | GET | /login?redirectTo=/masterwork/speed-test?trace=load | 300 | 13879 | 200 |  | other |
| 2 | 3453 | ? | next rsc | GET | / | 150 | 264 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 3453 | ? | next rsc | GET | /sign-up?redirectTo=/masterwork/speed-test?trace=load | 138 | 619 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 3453 | ? | next rsc | GET | /forgot-password?redirectTo=/masterwork/speed-test?trace=load | 138 | 351 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 3592 | ? | next rsc | GET | /sign-up?redirectTo=/masterwork/speed-test?trace=load | 136 | 2075 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 3593 | ? | next rsc | GET | /forgot-password?redirectTo=/masterwork/speed-test?trace=load | 132 | 2096 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 7 | 3603 | ? | next rsc | GET | / | 137 | 1788 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 8 | 3726 | ? | next rsc | GET | /forgot-password | 145 | 290 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 9 | 3729 | ? | next rsc | GET | /sign-up | 142 | 257 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 10 | 3759 | ? | 3p | GET | google.com/.well-known/web-identity | 155 | 532 | 200 |  | FedCM |
| 11 | 3759 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 130 | 396 | 200 |  | FedCM |
| 12 | 3915 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 96 | 115 | 200 |  | FedCM |

### /medical/speed-test — anon

final path `/medical/speed-test` · settled +1775ms · TTFB 924ms (103 at 106ms) · FCP 1116ms · LCP 1116ms · CLS 0 · JS 250 files / 13574 KB (4309 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /medical/speed-test?trace=load | 1072 | 24315 | 200 |  | other |
| 2 | 1782 | after | next | POST | /api/set-theme | 138 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3884 | after | next | POST | /api/diagnostics/client-error | 221 | 197 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7967 | after | next | POST | /api/acquisition/first-touch | 189 | 160 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /meetings/speed-test — anon

final path `/meetings/speed-test` · settled +1490ms · TTFB 730ms (103 at 155ms) · FCP 856ms · LCP 856ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /meetings/speed-test?trace=load | 814 | 24239 | 200 |  | other |
| 2 | 1496 | after | next | POST | /api/set-theme | 151 | 238 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3535 | after | next | POST | /api/diagnostics/client-error | 250 | 154 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7599 | after | next | POST | /api/acquisition/first-touch | 158 | 163 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /messages/speed-test — anon

final path `/messages/speed-test` · settled +4421ms · TTFB 3542ms (103 at 101ms) · FCP 3732ms · LCP 3732ms · CLS 0 · JS 254 files / 13735 KB (4367 KB wire) · static assets 264

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /messages/speed-test?trace=load | 3678 | 31562 | 200 |  | other |
| 2 | 4417 | before | next rsc | GET | /sign-up?source=messages-landing&redirectTo=/messages | 195 | 567 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 4417 | before | next rsc | GET | /login?redirectTo=/messages | 147 | 532 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 4428 | after | next | POST | /api/set-theme | 162 | 230 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 4565 | after | next rsc | GET | /login?redirectTo=/messages | 134 | 2108 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 4613 | after | next rsc | GET | /sign-up?source=messages-landing&redirectTo=/messages | 130 | 2052 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 4700 | after | next rsc | GET | /login | 129 | 251 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 4744 | after | next rsc | GET | /sign-up | 137 | 275 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 6612 | after | next | POST | /api/diagnostics/client-error | 287 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 10534 | after | next | POST | /api/acquisition/first-touch | 160 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /messenger/speed-test — anon

final path `/messenger/speed-test` · settled +1822ms · TTFB 702ms (103 at 108ms) · FCP 924ms · LCP 924ms · CLS 0 · JS 249 files / 13577 KB (4310 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /messenger/speed-test?trace=load | 826 | 31472 | 200 |  | other |
| 2 | 1802 | before | next rsc | GET | /sign-up?source=messages-landing&redirectTo=/messages | 144 | 371 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1802 | before | next rsc | GET | /login?redirectTo=/messages | 139 | 532 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1825 | after | next | POST | /api/set-theme | 129 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1943 | after | next rsc | GET | /login?redirectTo=/messages | 134 | 2313 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1947 | after | next rsc | GET | /sign-up?source=messages-landing&redirectTo=/messages | 139 | 2106 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 2079 | after | next rsc | GET | /login | 140 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 2087 | after | next rsc | GET | /sign-up | 129 | 282 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3849 | after | next | POST | /api/diagnostics/client-error | 227 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7913 | after | next | POST | /api/acquisition/first-touch | 159 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /notes/speed-test — anon

final path `/notes/speed-test` · settled +1678ms · TTFB 961ms (103 at 100ms) · FCP 1104ms · LCP 1104ms · CLS 0 · JS 273 files / 15818 KB (4998 KB wire) · static assets 283

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /notes/speed-test?trace=load | 1042 | 32699 | 200 |  | other |
| 2 | 1667 | before | next rsc | GET | /sign-up?source=notes-landing&redirectTo=/notes | 146 | 561 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1667 | before | next rsc | GET | /login?redirectTo=/notes | 158 | 337 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1694 | after | next | POST | /api/set-theme | 124 | 261 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1814 | after | next rsc | GET | /sign-up?source=notes-landing&redirectTo=/notes | 130 | 2097 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1830 | after | next rsc | GET | /login?redirectTo=/notes | 150 | 2050 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1945 | after | next rsc | GET | /sign-up | 148 | 307 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1982 | after | next rsc | GET | /login | 140 | 382 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3674 | after | next | POST | /api/diagnostics/client-error | 218 | 155 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7769 | after | next | POST | /api/acquisition/first-touch | 177 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /notifications/speed-test — anon

final path `/notifications/speed-test` · settled +1293ms · TTFB 582ms (103 at 100ms) · FCP 704ms · LCP 704ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /notifications/speed-test?trace=load | 657 | 24084 | 200 |  | other |
| 2 | 1297 | after | next | POST | /api/set-theme | 132 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3292 | after | next | POST | /api/diagnostics/client-error | 230 | 154 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7379 | after | next | POST | /api/acquisition/first-touch | 217 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /organizations/speed-test — anon

final path `/organizations/speed-test` · settled +3876ms · TTFB 2978ms (103 at 109ms) · FCP 3312ms · LCP 3312ms · CLS 0 · JS 251 files / 13577 KB (4311 KB wire) · static assets 260

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /organizations/speed-test?trace=load | 3101 | 25067 | 200 |  | other |
| 2 | 3871 | before | next rsc | GET | /login?redirectTo=/organizations/speed-test?trace=load | 139 | 574 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3871 | before | next rsc | GET | /sign-up?redirectTo=/organizations/speed-test?trace=load | 140 | 330 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 3871 | before | next rsc | GET | /features | 195 | 472 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 3883 | after | next | POST | /api/set-theme | 124 | 260 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 4011 | after | next rsc | GET | /login?redirectTo=/organizations/speed-test?trace=load | 158 | 2116 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 4012 | after | next rsc | GET | /sign-up?redirectTo=/organizations/speed-test?trace=load | 139 | 2110 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 4067 | after | next rsc | GET | /features | 135 | 2201 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 4152 | after | next rsc | GET | /sign-up | 141 | 294 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 4171 | after | next rsc | GET | /login | 134 | 248 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 5876 | after | next | POST | /api/diagnostics/client-error | 205 | 192 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 9971 | after | next | POST | /api/acquisition/first-touch | 167 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /pick-lists/speed-test — anon

final path `/pick-lists/speed-test` · settled +1409ms · TTFB 736ms (103 at 93ms) · FCP 904ms · LCP 904ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /pick-lists/speed-test?trace=load | 865 | 24073 | 200 |  | other |
| 2 | 1413 | after | next | POST | /api/set-theme | 135 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3432 | after | next | POST | /api/diagnostics/client-error | 236 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7504 | after | next | POST | /api/acquisition/first-touch | 172 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /podcast/speed-test — anon

final path `/podcast/speed-test` · settled +2407ms · TTFB 1604ms (103 at 137ms) · FCP 1796ms · LCP 1796ms · CLS 0 · JS 250 files / 13574 KB (4309 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /podcast/speed-test?trace=load | 1747 | 24392 | 200 |  | other |
| 2 | 2414 | after | next | POST | /api/set-theme | 132 | 245 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 4696 | after | next | POST | /api/diagnostics/client-error | 371 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 8728 | after | next | POST | /api/acquisition/first-touch | 300 | 163 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /presentations/speed-test — anon

final path `/presentations/speed-test` · settled +4766ms · TTFB 3949ms (103 at 92ms) · FCP 4152ms · LCP 4152ms · CLS 0 · JS 249 files / 13578 KB (4310 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /presentations/speed-test?trace=load | 4088 | 30092 | 200 |  | other |
| 2 | 4756 | before | next rsc | GET | /sign-up?source=presentations-landing&redirectTo=/presentations | 134 | 567 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 4757 | before | next rsc | GET | /login?redirectTo=/presentations | 149 | 345 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 4789 | after | next | POST | /api/set-theme | 125 | 248 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 4892 | after | next rsc | GET | /sign-up?source=presentations-landing&redirectTo=/presentations | 163 | 2132 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 4907 | after | next rsc | GET | /login?redirectTo=/presentations | 131 | 2307 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 5040 | after | next rsc | GET | /login | 146 | 267 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 5057 | after | next rsc | GET | /sign-up | 136 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 6804 | after | next | POST | /api/diagnostics/client-error | 293 | 167 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 10866 | after | next | POST | /api/acquisition/first-touch | 154 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /print/speed-test — anon

final path `/print/speed-test` · settled +1642ms · TTFB 859ms (103 at 93ms) · FCP 1088ms · LCP 1088ms · CLS 0 · JS 250 files / 13578 KB (4311 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /print/speed-test?trace=load | 986 | 24391 | 200 |  | other |
| 2 | 1649 | after | next | POST | /api/set-theme | 120 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3669 | after | next | POST | /api/diagnostics/client-error | 251 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7757 | after | next | POST | /api/acquisition/first-touch | 152 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /projects/speed-test — anon

final path `/login` · settled +neverms · TTFB 377ms (103 at 148ms) · FCP 496ms · LCP 496ms · CLS 0 · JS 90 files / 4861 KB (1555 KB wire) · static assets 97

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 120 | ? | next doc | GET | /login?redirectTo=/projects/speed-test?trace=load | 258 | 14452 | 200 |  | other |
| 2 | 701 | ? | next rsc | GET | / | 144 | 264 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 701 | ? | next rsc | GET | /sign-up?redirectTo=/projects/speed-test?trace=load | 135 | 603 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 701 | ? | next rsc | GET | /forgot-password?redirectTo=/projects/speed-test?trace=load | 144 | 352 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 838 | ? | next rsc | GET | /sign-up?redirectTo=/projects/speed-test?trace=load | 145 | 2066 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 845 | ? | next rsc | GET | /forgot-password?redirectTo=/projects/speed-test?trace=load | 149 | 2112 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 7 | 846 | ? | next rsc | GET | / | 137 | 1814 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 8 | 984 | ? | next rsc | GET | /sign-up | 149 | 257 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 9 | 995 | ? | next rsc | GET | /forgot-password | 126 | 286 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 10 | 1001 | ? | 3p | GET | google.com/.well-known/web-identity | 232 | 532 | 200 |  | FedCM |
| 11 | 1001 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 136 | 396 | 200 |  | FedCM |
| 12 | 1234 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 83 | 115 | 200 |  | FedCM |

### /rag/speed-test — anon

final path `/rag/speed-test` · settled +3662ms · TTFB 2989ms (103 at 113ms) · FCP 3120ms · LCP 3120ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /rag/speed-test?trace=load | 3111 | 24568 | 200 |  | other |
| 2 | 3666 | after | next | POST | /api/set-theme | 126 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 5694 | after | next | POST | /api/diagnostics/client-error | 244 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 9758 | after | next | POST | /api/acquisition/first-touch | 174 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /reports/speed-test — anon

final path `/reports/speed-test` · settled +4592ms · TTFB 3914ms (103 at 114ms) · FCP 4112ms · LCP 4112ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /reports/speed-test?trace=load | 4033 | 24394 | 200 |  | other |
| 2 | 4598 | after | next | POST | /api/set-theme | 128 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 6632 | after | next | POST | /api/diagnostics/client-error | 310 | 199 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 10703 | after | next | POST | /api/acquisition/first-touch | 172 | 170 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /research/speed-test — anon

final path `/research/speed-test` · settled +1623ms · TTFB 964ms (103 at 100ms) · FCP 1120ms · LCP 1120ms · CLS 0 · JS 251 files / 13585 KB (4314 KB wire) · static assets 260

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /research/speed-test?trace=load | 1047 | 24749 | 200 |  | other |
| 2 | 1629 | after | next | POST | /api/set-theme | 124 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3666 | after | next | POST | /api/diagnostics/client-error | 232 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7724 | after | next | POST | /api/acquisition/first-touch | 204 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /sandbox/speed-test — anon

final path `/sandbox/speed-test` · settled +1758ms · TTFB 787ms (103 at 94ms) · FCP 1124ms · LCP 1124ms · CLS 0 · JS 249 files / 13577 KB (4310 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /sandbox/speed-test?trace=load | 930 | 31362 | 200 |  | other |
| 2 | 1745 | before | next rsc | GET | /sign-up?source=sandboxes-landing&redirectTo=/sandbox | 192 | 358 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1745 | before | next rsc | GET | /login?redirectTo=/sandbox | 166 | 534 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1763 | after | next | POST | /api/set-theme | 117 | 251 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1916 | after | next rsc | GET | /login?redirectTo=/sandbox | 132 | 2051 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1938 | after | next rsc | GET | /sign-up?source=sandboxes-landing&redirectTo=/sandbox | 167 | 2055 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 2049 | after | next rsc | GET | /login | 149 | 260 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 2107 | after | next rsc | GET | /sign-up | 136 | 294 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3763 | after | next | POST | /api/diagnostics/client-error | 247 | 183 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7846 | after | next | POST | /api/acquisition/first-touch | 181 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /schedules/speed-test — anon

final path `/schedules/speed-test` · settled +1320ms · TTFB 648ms (103 at 113ms) · FCP 804ms · LCP 804ms · CLS 0 · JS 250 files / 13569 KB (4307 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /schedules/speed-test?trace=load | 655 | 25422 | 200 |  | other |
| 2 | 1315 | before | next rsc | GET | /login?redirectTo=/schedules/speed-test?trace=load | 144 | 345 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1315 | before | next rsc | GET | /sign-up?redirectTo=/schedules/speed-test?trace=load | 140 | 587 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1315 | before | next rsc | GET | /features | 148 | 303 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1326 | after | next | POST | /api/set-theme | 112 | 247 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1456 | after | next rsc | GET | /sign-up?redirectTo=/schedules/speed-test?trace=load | 164 | 2115 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1460 | after | next rsc | GET | /login?redirectTo=/schedules/speed-test?trace=load | 143 | 2347 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1464 | after | next rsc | GET | /features | 146 | 2237 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 1603 | after | next rsc | GET | /login | 182 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 1621 | after | next rsc | GET | /sign-up | 141 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3378 | after | next | POST | /api/diagnostics/client-error | 251 | 192 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 7435 | after | next | POST | /api/acquisition/first-touch | 168 | 158 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /scopes/speed-test — anon

final path `/scopes/speed-test` · settled +1354ms · TTFB 528ms (103 at 100ms) · FCP 764ms · LCP 764ms · CLS 0 · JS 249 files / 13577 KB (4310 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /scopes/speed-test?trace=load | 674 | 30876 | 200 |  | other |
| 2 | 1345 | before | next rsc | GET | /sign-up?source=scopes-landing&redirectTo=/scopes | 171 | 574 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1345 | before | next rsc | GET | /login?redirectTo=/scopes | 137 | 529 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1360 | after | next | POST | /api/set-theme | 123 | 243 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1484 | after | next rsc | GET | /login?redirectTo=/scopes | 157 | 2102 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1517 | after | next rsc | GET | /sign-up?source=scopes-landing&redirectTo=/scopes | 165 | 2065 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1642 | after | next rsc | GET | /login | 161 | 260 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1683 | after | next rsc | GET | /sign-up | 148 | 248 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3433 | after | next | POST | /api/diagnostics/client-error | 282 | 192 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7459 | after | next | POST | /api/acquisition/first-touch | 231 | 161 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /scraper/speed-test — anon

final path `/login` · settled +neverms · TTFB 352ms (103 at 212ms) · FCP 528ms · LCP 528ms · CLS 0 · JS 90 files / 4861 KB (1555 KB wire) · static assets 97

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 183 | ? | next doc | GET | /login?redirectTo=/scraper/speed-test?trace=load | 229 | 14178 | 200 |  | other |
| 2 | 1175 | ? | next rsc | GET | / | 139 | 228 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 1175 | ? | next rsc | GET | /sign-up?redirectTo=/scraper/speed-test?trace=load | 131 | 586 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 1175 | ? | next rsc | GET | /forgot-password?redirectTo=/scraper/speed-test?trace=load | 181 | 348 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 1308 | ? | next rsc | GET | /sign-up?redirectTo=/scraper/speed-test?trace=load | 299 | 2076 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 1315 | ? | next rsc | GET | / | 144 | 1787 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 7 | 1357 | ? | next rsc | GET | /forgot-password?redirectTo=/scraper/speed-test?trace=load | 141 | 2084 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 8 | 1473 | ? | 3p | GET | google.com/.well-known/web-identity | 159 | 532 | 200 |  | FedCM |
| 9 | 1473 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 135 | 396 | 200 |  | FedCM |
| 10 | 1500 | ? | next rsc | GET | /forgot-password | 136 | 312 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 11 | 1608 | ? | next rsc | GET | /sign-up | 132 | 281 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 12 | 1632 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 80 | 115 | 200 |  | FedCM |

### /search/speed-test — anon

final path `/search/speed-test` · settled +1637ms · TTFB 792ms (103 at 183ms) · FCP 1096ms · LCP 1096ms · CLS 0 · JS 249 files / 13577 KB (4310 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /search/speed-test?trace=load | 1033 | 30948 | 200 |  | other |
| 2 | 1628 | before | next rsc | GET | /sign-up?source=search-landing&redirectTo=/search | 145 | 381 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1628 | before | next rsc | GET | /login?redirectTo=/search | 141 | 523 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1644 | after | next | POST | /api/set-theme | 125 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1771 | after | next rsc | GET | /login?redirectTo=/search | 141 | 2296 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1773 | after | next rsc | GET | /sign-up?source=search-landing&redirectTo=/search | 156 | 2136 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1913 | after | next rsc | GET | /login | 140 | 287 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1930 | after | next rsc | GET | /sign-up | 124 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3726 | after | next | POST | /api/diagnostics/client-error | 259 | 205 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7760 | after | next | POST | /api/acquisition/first-touch | 172 | 148 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /shapes/speed-test — anon

final path `/shapes/speed-test` · settled +1468ms · TTFB 700ms (103 at 104ms) · FCP 872ms · LCP 872ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /shapes/speed-test?trace=load | 818 | 24584 | 200 |  | other |
| 2 | 1473 | after | next | POST | /api/set-theme | 112 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3529 | after | next | POST | /api/diagnostics/client-error | 263 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7575 | after | next | POST | /api/acquisition/first-touch | 186 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /spaces/speed-test — anon

final path `/spaces/speed-test` · settled +2231ms · TTFB 1274ms (103 at 105ms) · FCP 1612ms · LCP 1612ms · CLS 0 · JS 273 files / 17109 KB (5342 KB wire) · static assets 283

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /spaces/speed-test?trace=load | 1406 | 26288 | 200 |  | other |
| 2 | 2217 | before | db rpc | POST | space_sidebar ?order=id.asc&offset=0&limit=1000 | 314 | 711 | 401 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 2219 | before | db rpc | OPTIONS | space_sidebar ?order=id.asc&offset=0&limit=1000 | 199 | 0 | 200 |  | preflight |
| 4 | 2235 | after | next | POST | /api/set-theme | 123 | 235 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 2538 | after | next rsc | GET | /login?next=/spaces/speed-test | 134 | 528 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 2674 | after | next rsc | GET | /login?next=/spaces/speed-test | 136 | 2101 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 2812 | after | next rsc | GET | /login | 129 | 260 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 4035 | after | next | POST | /api/diagnostics/client-error | 267 | 192 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 4303 | after | next | POST | /api/diagnostics/client-error | 207 | 108 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 8345 | after | next | POST | /api/acquisition/first-touch | 203 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /staff/speed-test — anon

final path `/staff/speed-test` · settled +1505ms · TTFB 820ms (103 at 105ms) · FCP 964ms · LCP 964ms · CLS 0 · JS 250 files / 13569 KB (4307 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /staff/speed-test?trace=load | 895 | 24768 | 200 |  | other |
| 2 | 1511 | after | next | POST | /api/set-theme | 132 | 250 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1661 | after | next rsc | GET | /staff | 266 | 480 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1661 | after | next rsc | GET | /sandbox | 277 | 297 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1661 | after | next rsc | GET | /mandates/personal_staff.front_line | 371 | 428 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1929 | after | next rsc | GET | /staff | 150 | 2517 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1939 | after | next rsc | GET | /sandbox | 512 | 2583 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 2033 | after | next rsc | GET | /mandates/personal_staff.front_line | 252 | 2258 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3532 | after | next | POST | /api/diagnostics/client-error | 297 | 183 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7599 | after | next | POST | /api/acquisition/first-touch | 205 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /suggestions/speed-test — anon

final path `/suggestions/speed-test` · settled +1340ms · TTFB 661ms (103 at 101ms) · FCP 800ms · LCP 800ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /suggestions/speed-test?trace=load | 758 | 24929 | 200 |  | other |
| 2 | 1346 | after | next | POST | /api/set-theme | 116 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3351 | after | next | POST | /api/diagnostics/client-error | 262 | 209 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7429 | after | next | POST | /api/acquisition/first-touch | 168 | 158 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /surfaces/speed-test — anon

final path `/surfaces/speed-test` · settled +1164ms · TTFB 515ms (103 at 101ms) · FCP 652ms · LCP 652ms · CLS 0 · JS 250 files / 13569 KB (4307 KB wire) · static assets 259

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /surfaces/speed-test?trace=load | 602 | 25226 | 200 |  | other |
| 2 | 1159 | before | next rsc | GET | /login?redirectTo=/surfaces/speed-test?trace=load | 142 | 315 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1159 | before | next rsc | GET | /sign-up?redirectTo=/surfaces/speed-test?trace=load | 141 | 598 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1159 | before | next rsc | GET | /features | 156 | 504 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1169 | after | next | POST | /api/set-theme | 126 | 248 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1302 | after | next rsc | GET | /sign-up?redirectTo=/surfaces/speed-test?trace=load | 139 | 2147 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1302 | after | next rsc | GET | /login?redirectTo=/surfaces/speed-test?trace=load | 130 | 2154 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1316 | after | next rsc | GET | /features | 154 | 2201 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 1434 | after | next rsc | GET | /login | 148 | 399 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 1442 | after | next rsc | GET | /sign-up | 136 | 282 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3210 | after | next | POST | /api/diagnostics/client-error | 218 | 189 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 7266 | after | next | POST | /api/acquisition/first-touch | 200 | 148 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /tasks/speed-test — anon

final path `/login` · settled +neverms · TTFB 353ms (103 at 207ms) · FCP 548ms · LCP 548ms · CLS 0 · JS 90 files / 4861 KB (1555 KB wire) · static assets 97

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 178 | ? | next doc | GET | /login?redirectTo=/tasks/speed-test?trace=load | 227 | 14162 | 200 |  | other |
| 2 | 728 | ? | next rsc | GET | / | 167 | 237 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 3 | 728 | ? | next rsc | GET | /sign-up?redirectTo=/tasks/speed-test?trace=load | 142 | 564 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 4 | 728 | ? | next rsc | GET | /forgot-password?redirectTo=/tasks/speed-test?trace=load | 151 | 349 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 5 | 871 | ? | next rsc | GET | /sign-up?redirectTo=/tasks/speed-test?trace=load | 326 | 2090 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 6 | 880 | ? | next rsc | GET | /forgot-password?redirectTo=/tasks/speed-test?trace=load | 135 | 2128 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 7 | 895 | ? | next rsc | GET | / | 146 | 1815 | 200 | ×2 | globalThis.fetch@03zp-id3x7p3z |
| 8 | 1016 | ? | next rsc | GET | /forgot-password | 145 | 253 | 200 |  | globalThis.fetch@03zp-id3x7p3z |
| 9 | 1032 | ? | 3p | GET | google.com/.well-known/web-identity | 155 | 532 | 200 |  | FedCM |
| 10 | 1032 | ? | 3p | GET | accounts.google.com/gsi/fedcm.json | 112 | 396 | 200 |  | FedCM |
| 11 | 1188 | ? | 3p | GET | accounts.google.com/gsi/fedcm/listaccounts | 90 | 115 | 200 |  | FedCM |
| 12 | 1198 | ? | next rsc | GET | /sign-up | 142 | 284 | 200 |  | globalThis.fetch@03zp-id3x7p3z |

### /tools/speed-test — anon

final path `/tools/speed-test` · settled +2114ms · TTFB 820ms (103 at 384ms) · FCP 1260ms · LCP 1260ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /tools/speed-test?trace=load | 952 | 24035 | 200 |  | other |
| 2 | 2121 | after | next | POST | /api/set-theme | 274 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 4853 | after | next | POST | /api/diagnostics/client-error | 491 | 199 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 8445 | after | next | POST | /api/acquisition/first-touch | 287 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /transcripts/speed-test — anon

final path `/transcripts/speed-test` · settled +1361ms · TTFB 537ms (103 at 105ms) · FCP 740ms · LCP 740ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /transcripts/speed-test?trace=load | 571 | 24208 | 200 |  | other |
| 2 | 1368 | after | next | POST | /api/set-theme | 115 | 254 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3399 | after | next | POST | /api/diagnostics/client-error | 227 | 202 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7471 | after | next | POST | /api/acquisition/first-touch | 180 | 148 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /trash/speed-test — anon

final path `/trash/speed-test` · settled +1484ms · TTFB 728ms (103 at 99ms) · FCP 920ms · LCP 920ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /trash/speed-test?trace=load | 877 | 24193 | 200 |  | other |
| 2 | 1491 | after | next | POST | /api/set-theme | 140 | 254 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3611 | after | next | POST | /api/diagnostics/client-error | 223 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7624 | after | next | POST | /api/acquisition/first-touch | 179 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /user-settings/speed-test — anon

final path `/user-settings/speed-test` · settled +1587ms · TTFB 718ms (103 at 97ms) · FCP 1016ms · LCP 1016ms · CLS 0 · JS 282 files / 16307 KB (5156 KB wire) · static assets 291

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /user-settings/speed-test?trace=load | 858 | 25688 | 200 |  | other |
| 2 | 1567 | before | db table | GET | taxonomy_node ?select=id,slug,name,level,parent_id&order=id.asc&offset=0&limit=1000 | 309 | 781 | 401 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1567 | before | db table | GET | taxonomy_node ?select=id,slug,name,level,parent_id&order=id.asc&offset=0&limit=1000 | 455 | 971 | 401 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1572 | before | db table | OPTIONS | taxonomy_node ?select=id,slug,name,level,parent_id&order=id.asc&offset=0&limit=1000 | 183 | 0 | 200 | ×2 | preflight |
| 5 | 1579 | before | next rsc | GET | /login?redirectTo=/user-settings/speed-test?trace=load | 151 | 388 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1579 | before | next rsc | GET | /sign-up?redirectTo=/user-settings/speed-test?trace=load | 131 | 574 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1580 | before | next rsc | GET | /features | 150 | 486 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1583 | before | db table | OPTIONS | taxonomy_node ?select=id,slug,name,level,parent_id&order=id.asc&offset=0&limit=1000 | 174 | 0 | 200 | ×2 | preflight |
| 9 | 1593 | after | next | POST | /api/set-theme | 130 | 229 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 1713 | after | next rsc | GET | /sign-up?redirectTo=/user-settings/speed-test?trace=load | 156 | 2345 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 1731 | after | next rsc | GET | /features | 143 | 2247 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 1732 | after | next rsc | GET | /login?redirectTo=/user-settings/speed-test?trace=load | 138 | 2086 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 13 | 1870 | after | next rsc | GET | /sign-up | 257 | 286 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 14 | 1871 | after | next rsc | GET | /login | 145 | 276 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 15 | 1883 | after | next rsc | GET | /user-settings/general/notifications | 2242 | 359 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 16 | 1883 | after | next rsc | GET | /user-settings/general/personal-config | 417 | 378 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 17 | 2019 | after | next rsc | GET | /user-settings/general/language | 1997 | 316 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 18 | 2128 | after | next rsc | GET | /user-settings/general/privacy | 1956 | 325 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 19 | 2303 | after | next rsc | GET | /user-settings/general/personal-config | 279 | 6047 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 20 | 2584 | after | next rsc | GET | /user-settings/general/conversation-filters | 184 | 6096 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 21 | 2769 | after | next rsc | GET | /user-settings/general/lists | 146 | 6110 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 22 | 2916 | after | next rsc | GET | /user-settings/general/calendar-links | 164 | 6281 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 23 | 3081 | after | next rsc | GET | /user-settings/general/system | 293 | 6086 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 24 | 3376 | after | next rsc | GET | /user-settings/feedback | 153 | 6044 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 25 | 3388 | after | next | POST | /api/diagnostics/client-error | 270 | 169 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 26 | 3530 | after | next rsc | GET | /user-settings/access-requests | 142 | 6076 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 27 | 3659 | after | next | POST | /api/diagnostics/client-error | 216 | 109 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 28 | 3673 | after | next rsc | GET | /user-settings/appearance/theme | 141 | 6080 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 29 | 3815 | after | next rsc | GET | /user-settings/appearance/density | 141 | 6070 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 30 | 3958 | after | next rsc | GET | /user-settings/appearance/windows | 146 | 6064 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 31 | 4016 | after | next rsc | GET | /user-settings/general/language | 146 | 6057 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 32 | 4085 | after | next rsc | GET | /user-settings/general/privacy | 174 | 6084 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 33 | 4106 | after | next rsc | GET | /user-settings/appearance/site-workbench | 229 | 6055 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 34 | 4126 | after | next rsc | GET | /user-settings/general/notifications | 168 | 6030 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 35 | 4164 | after | next rsc | GET | /user-settings/ai/models | 160 | 6032 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 36 | 4260 | after | next rsc | GET | /user-settings/ai/assistants | 206 | 6104 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 37 | 4295 | after | next rsc | GET | /user-settings/ai/memory | 159 | 6054 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 38 | 4326 | after | next rsc | GET | /user-settings/ai/text-generation | 167 | 6111 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 39 | 4336 | after | next rsc | GET | /user-settings/ai/image-generation | 158 | 6252 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 40 | 7681 | after | next | POST | /api/acquisition/first-touch | 167 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /vault/speed-test — anon

final path `/vault/speed-test` · settled +3218ms · TTFB 2524ms (103 at 95ms) · FCP 2708ms · LCP 2708ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /vault/speed-test?trace=load | 2666 | 24123 | 200 |  | other |
| 2 | 3225 | after | next | POST | /api/set-theme | 116 | 235 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 5262 | after | next | POST | /api/diagnostics/client-error | 326 | 199 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 9314 | after | next | POST | /api/acquisition/first-touch | 175 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /voice/speed-test — anon

final path `/voice/speed-test` · settled +5045ms · TTFB 4199ms (103 at 120ms) · FCP 4400ms · LCP 4400ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /voice/speed-test?trace=load | 4338 | 23881 | 200 |  | other |
| 2 | 5051 | after | next | POST | /api/set-theme | 122 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 7064 | after | next | POST | /api/diagnostics/client-error | 252 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 11140 | after | next | POST | /api/acquisition/first-touch | 196 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /war-room/speed-test — anon

final path `/war-room/speed-test` · settled +1257ms · TTFB 525ms (103 at 106ms) · FCP 704ms · LCP 704ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /war-room/speed-test?trace=load | 645 | 24279 | 200 |  | other |
| 2 | 1263 | after | next | POST | /api/set-theme | 128 | 244 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3299 | after | next | POST | /api/diagnostics/client-error | 238 | 154 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7338 | after | next | POST | /api/acquisition/first-touch | 162 | 148 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /welcome/speed-test — anon

final path `/welcome/speed-test` · settled +1521ms · TTFB 779ms (103 at 121ms) · FCP 916ms · LCP 916ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /welcome/speed-test?trace=load | 873 | 24225 | 200 |  | other |
| 2 | 1525 | after | next | POST | /api/set-theme | 119 | 235 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 3575 | after | next | POST | /api/diagnostics/client-error | 283 | 199 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 7651 | after | next | POST | /api/acquisition/first-touch | 196 | 176 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /work/speed-test — anon

final path `/work/speed-test` · settled +1396ms · TTFB 692ms (103 at 104ms) · FCP 836ms · LCP 836ms · CLS 0 · JS 251 files / 13586 KB (4315 KB wire) · static assets 260

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /work/speed-test?trace=load | 756 | 25383 | 200 |  | other |
| 2 | 1390 | before | next rsc | GET | /login?redirectTo=/work/speed-test?trace=load | 151 | 384 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1390 | before | next rsc | GET | /sign-up?redirectTo=/work/speed-test?trace=load | 148 | 581 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1390 | before | next rsc | GET | /features | 151 | 497 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1402 | after | next | POST | /api/set-theme | 139 | 251 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1539 | after | next rsc | GET | /sign-up?redirectTo=/work/speed-test?trace=load | 133 | 2078 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1542 | after | next rsc | GET | /features | 147 | 2201 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 1560 | after | next rsc | GET | /login?redirectTo=/work/speed-test?trace=load | 138 | 2058 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 1674 | after | next rsc | GET | /sign-up | 140 | 285 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 1700 | after | next rsc | GET | /login | 135 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 11 | 3412 | after | next | POST | /api/diagnostics/client-error | 410 | 154 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 12 | 7483 | after | next | POST | /api/acquisition/first-touch | 182 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /workbooks/speed-test — anon

final path `/workbooks/speed-test` · settled +1450ms · TTFB 723ms (103 at 104ms) · FCP 952ms · LCP 952ms · CLS 0 · JS 249 files / 13578 KB (4310 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /workbooks/speed-test?trace=load | 873 | 30751 | 200 |  | other |
| 2 | 1439 | before | next rsc | GET | /sign-up?source=workbooks-landing&redirectTo=/workbooks | 148 | 572 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 1439 | before | next rsc | GET | /login?redirectTo=/workbooks | 504 | 332 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 1456 | after | next | POST | /api/set-theme | 109 | 270 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 5 | 1598 | after | next rsc | GET | /sign-up?source=workbooks-landing&redirectTo=/workbooks | 148 | 2111 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 6 | 1747 | after | next rsc | GET | /sign-up | 127 | 260 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 7 | 1944 | after | next rsc | GET | /login?redirectTo=/workbooks | 196 | 2068 | 200 | ×2 | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 8 | 2141 | after | next rsc | GET | /login | 143 | 257 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 9 | 3439 | after | next | POST | /api/diagnostics/client-error | 254 | 183 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 10 | 7538 | after | next | POST | /api/acquisition/first-touch | 224 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |

### /workflows/speed-test — anon

final path `/workflows/speed-test` · settled +3818ms · TTFB 2998ms (103 at 105ms) · FCP 3156ms · LCP 3156ms · CLS 0 · JS 249 files / 13566 KB (4305 KB wire) · static assets 258

| # | at ms | phase | kind | method | path | ms | bytes | status | ×dup | caller |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | before | next doc | GET | /workflows/speed-test?trace=load | 3117 | 24294 | 200 |  | other |
| 2 | 3824 | after | next | POST | /api/set-theme | 122 | 261 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 3 | 5850 | after | next | POST | /api/diagnostics/client-error | 318 | 198 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
| 4 | 9933 | after | next | POST | /api/acquisition/first-touch | 196 | 157 | 200 |  | window.fetch@03zp-id3x7p3z < globalThis.fetch@03zp-id3x7p3z |
