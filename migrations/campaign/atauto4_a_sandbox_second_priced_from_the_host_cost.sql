-- guard: custom/system_enabled
-- lane: AT-AUTO4
-- lock: platform
--
-- AT-AUTO4: the price of one sandbox second, from the host's real cost instead of a guess (atauto3_b guessed $0.00003).
-- Basis: the sandbox host is one EC2 t3.xlarge (matrx-sandbox infra/terraform/variables.tf default; 4 vCPU / 16 GB) at the AWS
-- us-east-1 on-demand rate of $0.1664/hour. A sandbox is limited to 2 cores / 4 GB (matrx-sandbox docs/ARCHITECTURE.md), so the
-- host holds 2 at a time by CPU (4 by memory); charging the CPU-bound 2 makes the knob cover idle headroom:
-- $0.1664 / 2 sandboxes / 3600 s = $0.0000231/s, set to 0.000023. Review when the host type, the tier pricing or the
-- packing density changes, and on the review date either way.
-- Inverse: migrations/inverse/atauto4_a_sandbox_second_priced_from_the_host_cost_down.sql.
update platform.feature_knob
   set value = '0.000023'::jsonb, default_value = '0.000023'::jsonb,
       basis = 'EC2 t3.xlarge on-demand us-east-1 $0.1664/h (the sandbox host, matrx-sandbox terraform default) / 2 concurrent sandboxes (2 cores each of 4 vCPU) / 3600 s = $0.0000231/s. AT-AUTO4, 2026-10-15; review when the host type or packing changes.',
       review_due = date '2026-11-15', set_by = 'agent'
 where feature = 'platform.external_api_prices' and key = 'matrx_sandbox_automation_script_usd';
