-- Compare, round 2 (2026-10-22): the place record we buy has 38 keys, the catalog listed 15 of them.
-- Describe all of them (the page now reads review_distribution, contact, closed flags, attributes, categories,
-- reviews). Additive and idempotent: the list is replaced by itself plus the missing keys, order kept.
UPDATE scraper.data_source ds
SET output_fields = (
  SELECT to_jsonb(array_agg(k ORDER BY ord))
  FROM (
    SELECT k, min(ord) AS ord FROM (
      SELECT value AS k, ordinality AS ord FROM jsonb_array_elements_text(ds.output_fields) WITH ORDINALITY
      UNION ALL
      SELECT x, 1000 + o FROM unnest(ARRAY[
        'phone_number','open_website','reservation_link','is_claimed','permanently_closed','temporarily_closed',
        'review_distribution','all_categories','category_index','top_reviews','reviews_snippets','photos_and_videos',
        'popular_times','questions_answers','people_also_search','web_results','directory_categories',
        'directory_locations','cid','cid_location','fid_location','country_code','input','timestamp'
      ]::text[]) WITH ORDINALITY AS t(x, o)
    ) u GROUP BY k
  ) d
)
WHERE ds.key = 'google_maps_place';
