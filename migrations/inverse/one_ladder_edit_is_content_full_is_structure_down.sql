-- window-class: drops the _a000_edit_content_is_editor trigger on iam.permissions and platform.share_links; ACCESS EXCLUSIVE plus the supautils set, apply 0100-0400 Pacific
-- lane: ONE-LADDER
-- Inverse of one_ladder_edit_is_content_full_is_structure.sql, REWRITTEN 2026-10-11 as a PATCH-IN-PLACE undo: for each of the 57 functions the ladder changed it reads the CURRENT live body
-- and reverses ONLY the ladder's own text change (structure doors admin -> editor, the retired edit_content level back in the level lists and iam.content_levels / permission_means,
-- the share doors back to their old rule). It never writes a stored snapshot over a live body, so another lane's later edits survive. Every hunk must match exactly once or the whole file stops
-- (nothing half-applied); custom.migrate_undo is the one function a later lane (MEMBER-DEFECTS-4) rewrote at the ladder's spot, and its hunk is optional (skipped with a notice).
-- It also restores the 28 edit_content grants (only those still at editor), drops the fold trigger, and drops iam.may_grant_as / iam.holds_level_as plus their knobs and door rows ONLY when no
-- other function calls them (otherwise it keeps them and says so).
--
-- Hashes below are the live bodies this file was written against (production, 2026-10-11).
-- based-on: public.audience_share_preview(text, uuid, text) e8c957e02daff345ac6bc3c2afd4a27f2a2d1ec1f1f5d2dcd5071ae9fa753dea
-- based-on: content._document_guard_folder() 07753c4772004eee055d125d73bc72decbecd856a8a321e14aaf81ab859af2c6
-- based-on: content.space_publish(uuid, boolean, boolean, boolean, text) 1ec7151236a63f29f0b1d7ff6fb7855a4a4676b685ba1b8b1f99fde98b2f740f
-- based-on: content.space_save(uuid, integer, jsonb, text, text, text) a4681186137436d7f5e26440888a8c40d3a1feb091d095e252fa92834a1a6386
-- based-on: content.space_set_trashed(uuid, boolean) 00f7f99a430a96bb10f3cd11748e41f08b2d9b39950a788fa209210ad9f5839c
-- based-on: content.version_publish(uuid, integer) 98b3c76ffe2a610f4dd8610b3b1a7d95346242496cdff17793919ad5d2d04a73
-- based-on: content.version_unpublish(uuid) 6653ea3b47b9e5f366a057581df971c6b3033797f76ae0ca01d4f6109a4d3d53
-- based-on: public.create_share_link(text, uuid, text, timestamp with time zone, integer, text) fbee7e088d05ce2670c40e37c6c58546e702f64a5bc57d8205261a2411becefa
-- based-on: custom.action_declare(uuid, uuid, jsonb) 64092c9e393971fcf6592836bc085b7a1805dbbbc1d7b59588b124756f269e31
-- based-on: custom.automation_declare(uuid, uuid, jsonb, uuid) cc904a4490f969858e477d846befa80ecf2a6206a79be876a58845126a7d926c
-- based-on: custom.checklist_declare(uuid, jsonb, uuid) 428156e869ce03af3ffed9a3790b45a8fd925999447e0397324a2dd954cf7dfe
-- based-on: custom.dashboard_declare(uuid, uuid, text, jsonb, jsonb, uuid) 7919f0a2946e358beea1d5210e31d685f3fa7f39d6547c0e9716dbf2a97f5470
-- based-on: custom.doc_template_delete(uuid, uuid) d92feea645e85f60b9fdd67df4a14f5781a43ddc35f5c666700f78cf6a0ee1f0
-- based-on: custom.doc_template_restore(uuid, uuid) fcd07e0c285823986c0583ad6f82c7e617416bf7adda37fd7b88901abcd1532d
-- based-on: custom.doc_template_save(uuid, uuid, text, text, uuid) 76b4f0482f64296628ebc309b70c443977097b73072b09a4e5272ac858bb40bd
-- based-on: custom.io_import_open(uuid, uuid, text, text, jsonb) 683f83a9cdd3fefea8ad790e16e0d3fd1f5e5d6015d3a1ae9cfa10f828960662
-- based-on: custom.migrate_delete(uuid, uuid, text) af2a22e184fae7190d5b343c3c6b57202dcf8755af903e09ee9b0eb93da860ac
-- based-on: custom.migrate_extract_parent(uuid, uuid, uuid, text[], text) 759dfdb7c0656462543a90eed6d9b718d01af13bef482400bb7551678828c30a
-- based-on: custom.migrate_merge(uuid, uuid, uuid, text) 095a2f05e002f9e0822b027681a5eba5f6ec3d7b4df3222570c399c8e5065127
-- based-on: custom.migrate_rename(uuid, uuid, text, text) 4ac379bedc068e7e22422b8bb6bf1a7e27a4d6cc0f53b3de9b84fb1e99e605d2
-- based-on: custom.migrate_reparent(uuid, uuid, uuid, text) c679070a34480e8b7faeb77fd8b3e8a0318536c23ec8b097fa50c93024ee681a
-- based-on: custom.migrate_retype(uuid, uuid, text, text) db3cd331599ac3df96369b1e1bb01276147a50a91851a402c52b4df190f6eba0
-- based-on: custom.migrate_split(uuid, uuid, text[], text) 6971c658607434115017849333c5ecb6c8542b787a1bd8062b08f54396475a9b
-- based-on: custom.migrate_undo(uuid, uuid) 70350b4221b3b37735009b2fa27126b50110b23aba6fe6639b6474667d9c1c3a
-- based-on: custom.record_change_many(uuid, uuid, jsonb) f4e2da08cf859b40a6753feafabdf388f0da7685dc3166f3436711199481b40d
-- based-on: custom.record_reparent(uuid, uuid, uuid) 24608a8d8972a1fd6387506500941b57cb8ce50ad4bf915ea6ea314cdd1be0b2
-- based-on: custom.record_update(uuid, uuid, jsonb, integer) 5b04211e4514a7fb088e0e184687207692e5aa395f48490c4efd82398beb1f51
-- based-on: custom.record_upsert(uuid, uuid, text[], jsonb, integer) c45cc99e91e1fa2e31c42f3e29610cd0aef785767e2fe2e4540ebfdd8f078a27
-- based-on: custom.record_write_graph(uuid, uuid, jsonb, jsonb, jsonb) 9c938a84b0442a434b0877f2e8f1ccbb5aa42d791ac0d0ca1e3f02d5bb41efe5
-- based-on: custom.row_template_declare(uuid, uuid, jsonb) 3b6109850269dc19009a444a6f0a9a63fea79a7dac2842fb750f9c87c64a0ae0
-- based-on: custom.share_grant(uuid, uuid, text, uuid, permission_level) 7e8ed31402173acd1b584e7c8043416c606f6a8836c3747d6b0c0b0ad2390a1a
-- based-on: custom.table_archive(uuid, uuid, integer, boolean) 04479480da16dcfb5a6fa191187fe107877192b084ba8bef487164de9b7f77bd
-- based-on: custom.table_decorate(uuid, uuid, text[], jsonb) 9da471a4da742008d10e37c6ae7b17718abada53b78a425d7385b6cbd5370ae9
-- based-on: custom.table_dimensions_set(uuid, uuid, jsonb) d52cb0f6322a97b01ddb1c94e82963bde85c70a2c188e3578d887e1fc2c298f0
-- based-on: custom.table_restore(uuid, uuid, integer) 7ca71a0249411994c3dbae7d8faa2fe940d1d07f765567a4ba9936d1ed26f47d
-- based-on: custom.table_share_outside_grant(uuid, uuid, text, permission_level) ce8c15e78e43a4fc7f68a15383d1771068fdce001d2c0c480b4dbe4dc48daf47
-- based-on: custom.table_share_outside_invite(uuid, uuid, text, permission_level) 258357d9fdbe467871bddb263bc84cf87ff4bdc7c021d45df865de37c81df108
-- based-on: custom.table_sync(uuid, uuid, jsonb) f2ab1e2a1e2d5288c8a6582218ae65c4638578f6a0c7f30610fec8b505844061
-- based-on: custom.table_sync_settings_set(uuid, uuid, jsonb) e2e2e0d7f3c543b0cc0a9579708b9d2a5640f5710d9ade2037a6ffc971b2f5ab
-- based-on: custom.view_declare(uuid, uuid, jsonb) c61c685e889ef2559e915d0fad3ccd5eae4e09f80a374e8489e5bffc602dce9f
-- based-on: custom.view_designate(uuid, uuid, uuid, text) 503625330a189a55479c941510117500f6c688dadf2344e0715ff673049114cd
-- based-on: custom.work_template_declare(uuid, text, jsonb) 571fa4842f714202e69a76fe7119145f0cc8959f219ed6c452fb76d815ee7547
-- based-on: public.grant_org_availability(text, uuid, uuid, text) 2b7463127af15c10f224b812b1191af142a3df50ce9dfecd25a37e1de16b37a2
-- based-on: iam._guard_edit_content_structure() ba061a66d12050941aa427dcc2aead6ae33d03e1e74ac55109d10c1f05bbba0e
-- based-on: iam.content_levels() 226f768775683c05156eca217c0c59648d2656bb902c87c0da2f3479d2589fb1
-- based-on: iam.permission_means(permission_level) 32877944e3288be6b88f1555deb1341b139b281eacebcd31afe255330f284927
-- based-on: iam.share_with_person(text, uuid, uuid, permission_level, uuid, boolean, text, timestamp with time zone, boolean, text) 6377b7381b71f92964c9990883dab6bc18dc99d2c52c50296f787ef3cfa7263e
-- based-on: public.move_file(uuid, uuid) ee6fd35d40c11a17fbd7ae582f835c1b99a36d857ea15d6a87959fc164d94de6
-- based-on: public.rename_file(uuid, text) b65b6f8c939a0dc00d0c6fc808cdf5c88e5381fe9c8c74682ba1764963667630
-- based-on: public.rename_folder(uuid, text, uuid) 61fd9fb02140a32d7843db24259571349cefa9541d83825fc3a8940dfd8e3476
-- based-on: public.restore_file(uuid) 1b7c941da11bb0ebcca064862fa3628b230aec71fd89051e086d1ef1ef997cb2
-- based-on: public.restore_folder(uuid) f726f9b1ad03bd864c2d9f1b88e4c6e22761718ffbbdcfe6528dfcebb943d0fe
-- based-on: public.share_resource_with_user(text, uuid, uuid, text) f5e8da5c852ca66b43ba247046874eac301b9eba356af56b7e5ab995dac9d1a3
-- based-on: public.share_with_audience(text, uuid, text, text[]) 576e2544335532879e3c421d5f2128cc5cfbd41891d42bf5735146a23006dc62
-- based-on: public.soft_delete_file(uuid) 7fae35c3f0f438a7a756819b4804177dda91d01be61df5b2a8364e81d4a863b3
-- based-on: public.soft_delete_folder(uuid) ed4121d93fc2a7bc7965a6f195c5b91df2339cc8643b6d12c4c1ce5fd7dcd43c
-- based-on: public.update_permission_level(text, uuid, uuid, uuid, text) 31ba364947eab16f2d0dbd2c7ce3c68fa783b14a711ebb03499fac7095935d82

do $inv_patch$
declare
  r record; v_def text; v_n int;
begin
  for r in select * from (values
    (1, 'audience_share_preview(text,uuid,text)', false, $inv_hunk$  if p_level is not null and p_level not in ('viewer', 'commenter', 'editor', 'admin') then
$inv_hunk$, $inv_hunk$  if p_level is not null and p_level not in ('viewer', 'commenter', 'edit_content', 'editor', 'admin') then
$inv_hunk$),
    (2, 'content._document_guard_folder()', false, $inv_hunk$  if not iam.has_access('folder', new.folder_id, 'admin') then
$inv_hunk$, $inv_hunk$  if not iam.has_access('folder', new.folder_id, 'editor') then
$inv_hunk$),
    (3, 'content.space_publish(uuid,boolean,boolean,boolean,text)', false, $inv_hunk$  if not iam.has_access('document', p_space_id, 'admin'::public.permission_level) then
$inv_hunk$, $inv_hunk$  if not iam.has_access('document', p_space_id, 'editor'::public.permission_level) then
$inv_hunk$),
    (4, 'content.space_save(uuid,integer,jsonb,text,text,text)', false, $inv_hunk$     and not iam.has_access('document', p_document_id, 'editor'::public.permission_level) then
$inv_hunk$, $inv_hunk$     and not iam.has_access('document', p_document_id, 'edit_content') then
$inv_hunk$),
    (5, 'content.space_set_trashed(uuid,boolean)', false, $inv_hunk$          or iam.has_access('document', p_document_id, 'admin'::public.permission_level)
$inv_hunk$, $inv_hunk$          or iam.has_access('document', p_document_id, 'editor'::public.permission_level)
$inv_hunk$),
    (6, 'content.version_publish(uuid,integer)', false, $inv_hunk$     and not iam.has_access('document', p_document_id, 'admin'::public.permission_level) then
$inv_hunk$, $inv_hunk$     and not iam.has_access('document', p_document_id, 'editor') then
$inv_hunk$),
    (7, 'content.version_unpublish(uuid)', false, $inv_hunk$     and not iam.has_access('document', p_document_id, 'admin'::public.permission_level) then
$inv_hunk$, $inv_hunk$     and not iam.has_access('document', p_document_id, 'editor') then
$inv_hunk$),
    (8, 'create_share_link(text,uuid,text,timestamp with time zone,integer,text)', false, $inv_hunk$  IF COALESCE(p_permission_level,'viewer') NOT IN ('viewer', 'commenter', 'editor', 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level'); END IF;
$inv_hunk$, $inv_hunk$  IF COALESCE(p_permission_level,'viewer') NOT IN ('viewer', 'commenter', 'edit_content', 'editor', 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level'); END IF;
$inv_hunk$),
    (9, 'create_share_link(text,uuid,text,timestamp with time zone,integer,text)', false, $inv_hunk$  IF iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, COALESCE(p_permission_level, 'viewer')::permission_level, 'anyone', NULL) IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, COALESCE(p_permission_level, 'viewer')::permission_level, 'anyone', NULL)); END IF;
$inv_hunk$, $inv_hunk$  IF NOT public.is_resource_owner(v_resolved.resource_type, p_resource_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Only the owner can create a share link'); END IF;
$inv_hunk$),
    (10, 'custom.action_declare(uuid,uuid,jsonb)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (11, 'custom.automation_declare(uuid,uuid,jsonb,uuid)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (12, 'custom.checklist_declare(uuid,jsonb,uuid)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, v_about, 'custom.checklist_declare',
                                          'admin'::public.permission_level, 'table');
  if not exists (select 1 from custom.record r
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, v_about, 'custom.checklist_declare',
                                          'editor'::public.permission_level, 'table');
  if not exists (select 1 from custom.record r
$inv_hunk$),
    (13, 'custom.checklist_declare(uuid,jsonb,uuid)', false, $inv_hunk$                                            'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                            'editor'::public.permission_level, 'table');
$inv_hunk$),
    (14, 'custom.checklist_declare(uuid,jsonb,uuid)', false, $inv_hunk$                                            'admin'::public.permission_level, 'checklist');
$inv_hunk$, $inv_hunk$                                            'editor'::public.permission_level, 'checklist');
$inv_hunk$),
    (15, 'custom.dashboard_declare(uuid,uuid,text,jsonb,jsonb,uuid)', false, $inv_hunk$                                          'admin'::public.permission_level, 'dashboard');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'dashboard');
$inv_hunk$),
    (16, 'custom.doc_template_delete(uuid,uuid)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (17, 'custom.doc_template_restore(uuid,uuid)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (18, 'custom.doc_template_save(uuid,uuid,text,text,uuid)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.doc_template_save', 'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.doc_template_save', 'editor'::public.permission_level, 'table');
$inv_hunk$),
    (19, 'custom.doc_template_save(uuid,uuid,text,text,uuid)', false, $inv_hunk$                                            'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                            'editor'::public.permission_level, 'table');
$inv_hunk$),
    (20, 'custom.io_import_open(uuid,uuid,text,text,jsonb)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (21, 'custom.migrate_delete(uuid,uuid,text)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.migrate_delete', 'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.migrate_delete', 'editor'::public.permission_level, 'record');
$inv_hunk$),
    (22, 'custom.migrate_extract_parent(uuid,uuid,uuid,text[],text)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_extract_parent', 'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_extract_parent', 'editor'::public.permission_level, 'record');
$inv_hunk$),
    (23, 'custom.migrate_merge(uuid,uuid,uuid,text)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_winner_id, 'custom.migrate_merge', 'admin'::public.permission_level, 'record');
  perform custom.assert_client_may_change(p_organization_id, p_loser_id, 'custom.migrate_merge', 'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_winner_id, 'custom.migrate_merge', 'editor'::public.permission_level, 'record');
  perform custom.assert_client_may_change(p_organization_id, p_loser_id, 'custom.migrate_merge', 'editor'::public.permission_level, 'record');
$inv_hunk$),
    (24, 'custom.migrate_rename(uuid,uuid,text,text)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_rename', 'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_rename', 'editor'::public.permission_level, 'record');
$inv_hunk$),
    (25, 'custom.migrate_reparent(uuid,uuid,uuid,text)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_reparent', 'admin'::public.permission_level, 'record');
  perform custom.assert_client_may_change(p_organization_id, p_parent_id, 'custom.migrate_reparent', 'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_reparent', 'editor'::public.permission_level, 'record');
  perform custom.assert_client_may_change(p_organization_id, p_parent_id, 'custom.migrate_reparent', 'editor'::public.permission_level, 'record');
$inv_hunk$),
    (26, 'custom.migrate_retype(uuid,uuid,text,text)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_retype', 'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_id, 'custom.migrate_retype', 'editor'::public.permission_level, 'record');
$inv_hunk$),
    (27, 'custom.migrate_split(uuid,uuid,text[],text)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.migrate_split', 'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.migrate_split', 'editor'::public.permission_level, 'record');
$inv_hunk$),
    (28, 'custom.migrate_undo(uuid,uuid)', true, $inv_hunk$                                          'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'record');
$inv_hunk$),
    (29, 'custom.record_change_many(uuid,uuid,jsonb)', false, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'edit_content'::public.permission_level, 'table');
$inv_hunk$),
    (30, 'custom.record_change_many(uuid,uuid,jsonb)', false, $inv_hunk$      perform custom.assert_client_may_change(p_organization_id, v_id, 'custom.record_change_many', 'editor'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$      perform custom.assert_client_may_change(p_organization_id, v_id, 'custom.record_change_many', 'edit_content'::public.permission_level, 'record');
$inv_hunk$),
    (31, 'custom.record_reparent(uuid,uuid,uuid)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.record_reparent', 'admin'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.record_reparent', 'editor'::public.permission_level, 'record');
$inv_hunk$),
    (32, 'custom.record_update(uuid,uuid,jsonb,integer)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.record_update', 'editor'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_record_id, 'custom.record_update', 'edit_content'::public.permission_level, 'record');
$inv_hunk$),
    (33, 'custom.record_upsert(uuid,uuid,text[],jsonb,integer)', false, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'edit_content'::public.permission_level, 'table');
$inv_hunk$),
    (34, 'custom.record_write_graph(uuid,uuid,jsonb,jsonb,jsonb)', false, $inv_hunk$                                            'editor'::public.permission_level, 'record');
$inv_hunk$, $inv_hunk$                                            'edit_content'::public.permission_level, 'record');
$inv_hunk$),
    (35, 'custom.row_template_declare(uuid,uuid,jsonb)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (36, 'custom.share_grant(uuid,uuid,text,uuid,permission_level)', false, $inv_hunk$                                          'editor'::public.permission_level, 'record');
  if not custom.query_is_store_owner() and custom.query_principal() is not null
     and iam.may_grant_as(custom.query_principal(), 'record', p_subject_id, p_level, 'person', p_principal_id) is not null then
    raise exception '%', iam.may_grant_as(custom.query_principal(), 'record', p_subject_id, p_level, 'person', p_principal_id) using errcode = '42501';
  end if;
$inv_hunk$, $inv_hunk$                                          'admin'::public.permission_level, 'record');
$inv_hunk$),
    (37, 'custom.table_archive(uuid,uuid,integer,boolean)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_archive', 'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_archive');
$inv_hunk$),
    (38, 'custom.table_decorate(uuid,uuid,text[],jsonb)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (39, 'custom.table_dimensions_set(uuid,uuid,jsonb)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (40, 'custom.table_restore(uuid,uuid,integer)', false, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_restore', 'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$  perform custom.assert_client_may_change(p_organization_id, p_table_id, 'custom.table_restore');
$inv_hunk$),
    (41, 'custom.table_share_outside_grant(uuid,uuid,text,permission_level)', false, $inv_hunk$            'custom.table_share_outside_grant', 'editor'::public.permission_level, 'table');
  if not custom.query_is_store_owner() and custom.query_principal() is not null
     and iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) is not null then
    raise exception '%', iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) using errcode = '42501';
  end if;
$inv_hunk$, $inv_hunk$            'custom.table_share_outside_grant', 'admin'::public.permission_level, 'table');
$inv_hunk$),
    (42, 'custom.table_share_outside_invite(uuid,uuid,text,permission_level)', false, $inv_hunk$            'custom.table_share_outside_invite', 'editor'::public.permission_level, 'table');
  if not custom.query_is_store_owner() and custom.query_principal() is not null
     and iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) is not null then
    raise exception '%', iam.may_grant_as(custom.query_principal(), 'record', p_table_id, p_level, 'anyone', null) using errcode = '42501';
  end if;
$inv_hunk$, $inv_hunk$            'custom.table_share_outside_invite', 'admin'::public.permission_level, 'table');
$inv_hunk$),
    (43, 'custom.table_sync(uuid,uuid,jsonb)', false, $inv_hunk$                                            'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                            'editor'::public.permission_level, 'table');
$inv_hunk$),
    (44, 'custom.table_sync_settings_set(uuid,uuid,jsonb)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (45, 'custom.view_declare(uuid,uuid,jsonb)', false, $inv_hunk$       and not custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'admin'::public.permission_level) then
$inv_hunk$, $inv_hunk$       and not custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'editor'::public.permission_level) then
$inv_hunk$),
    (46, 'custom.view_declare(uuid,uuid,jsonb)', false, $inv_hunk$                 or custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'admin'::public.permission_level);
$inv_hunk$, $inv_hunk$                 or custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'editor'::public.permission_level);
$inv_hunk$),
    (47, 'custom.view_declare(uuid,uuid,jsonb)', false, $inv_hunk$              or custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'admin'::public.permission_level)) then
$inv_hunk$, $inv_hunk$              or custom.has_visibility(custom.query_principal(), 'record', p_table_id, 'editor'::public.permission_level)) then
$inv_hunk$),
    (48, 'custom.view_designate(uuid,uuid,uuid,text)', false, $inv_hunk$                                          'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                          'editor'::public.permission_level, 'table');
$inv_hunk$),
    (49, 'custom.work_template_declare(uuid,text,jsonb)', false, $inv_hunk$                                                'admin'::public.permission_level, 'table');
$inv_hunk$, $inv_hunk$                                                'editor'::public.permission_level, 'table');
$inv_hunk$),
    (50, 'grant_org_availability(text,uuid,uuid,text)', false, $inv_hunk$  IF iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, COALESCE(p_permission_level, 'viewer')::permission_level, 'organization', p_target_org_id) IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, COALESCE(p_permission_level, 'viewer')::permission_level, 'organization', p_target_org_id));
$inv_hunk$, $inv_hunk$  IF NOT public.may_manage_sharing(v_resolved.resource_type, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'You need Admin on this to decide who else may see it. Ask whoever holds it, or an owner of the organization.');
$inv_hunk$),
    (51, 'grant_org_availability(text,uuid,uuid,text)', false, $inv_hunk$  IF v_level NOT IN ('viewer', 'commenter', 'editor', 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level'); END IF;
$inv_hunk$, $inv_hunk$  IF v_level NOT IN ('viewer', 'commenter', 'edit_content', 'editor', 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level'); END IF;
$inv_hunk$),
    (52, 'iam._guard_edit_content_structure()', false, $inv_hunk$    if coalesce(iam.has_access(v_token, (v_old ->> 'id')::uuid, 'admin'::public.permission_level), false)
$inv_hunk$, $inv_hunk$    if coalesce(iam.has_access(v_token, (v_old ->> 'id')::uuid, 'editor'::public.permission_level), false)
$inv_hunk$),
    (53, 'iam._guard_edit_content_structure()', false, $inv_hunk$      message = format('Edit access does not include changing "%s" on this %s.', v_col, v_token),
$inv_hunk$, $inv_hunk$      message = format('Edit-content access does not include changing "%s" on this %s.', v_col, v_token),
$inv_hunk$),
    (54, 'iam._guard_edit_content_structure()', false, $inv_hunk$      hint    = 'Ask the owner to make this change, or ask them for Full access to this item.';
$inv_hunk$, $inv_hunk$      hint    = 'Ask the owner to make this change, or ask them for editor access to this item.';
$inv_hunk$),
    (55, 'iam.content_levels()', false, $inv_hunk$             when 'editor'    then 'can change its values and content, not its structure'
             when 'admin'     then 'can also change its structure and decide who else may'
$inv_hunk$, $inv_hunk$             when 'edit_content' then 'can change the content, not the structure or the sharing'
             when 'editor'    then 'can change it'
             when 'admin'     then 'can change it and decide who else may'
$inv_hunk$),
    (56, 'iam.content_levels()', false, $inv_hunk$       and e.enumlabel <> 'edit_content'   -- ONE-LADDER: retired 2026-10-10
$inv_hunk$, $inv_hunk$$inv_hunk$),
    (57, 'iam.permission_means(permission_level)', false, $inv_hunk$           when 'editor' then 'can read and change its values and content, not its structure'
$inv_hunk$, $inv_hunk$           when 'edit_content' then 'can read and change the content, not the structure or the sharing'
           when 'editor' then 'can read and change it'
$inv_hunk$),
    (58, 'iam.share_with_person(text,uuid,uuid,permission_level,uuid,boolean,text,timestamp with time zone,boolean,text)', false, $inv_hunk$    if iam.may_grant_as(p_actor, v_type, p_resource_id, p_level, 'person', p_target_user_id) is not null then
      return jsonb_build_object('success', false, 'error', iam.may_grant_as(p_actor, v_type, p_resource_id, p_level, 'person', p_target_user_id));
$inv_hunk$, $inv_hunk$    if not iam.may_manage_sharing_as(p_actor, v_type, p_resource_id) then
      return jsonb_build_object('success', false, 'error',
        'You need Admin on this to decide who else may see it. Ask whoever holds it, or an owner of the organization.');
$inv_hunk$),
    (59, 'move_file(uuid,uuid)', false, $inv_hunk$  IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'admin') THEN
$inv_hunk$, $inv_hunk$  IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'editor') THEN
$inv_hunk$),
    (60, 'move_file(uuid,uuid)', false, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_new_parent_folder_id, 'admin') THEN
$inv_hunk$, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_new_parent_folder_id, 'editor') THEN
$inv_hunk$),
    (61, 'rename_file(uuid,text)', false, $inv_hunk$  IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'admin') THEN
$inv_hunk$, $inv_hunk$  IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'editor') THEN
$inv_hunk$),
    (62, 'rename_folder(uuid,text,uuid)', false, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'admin') THEN
$inv_hunk$, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'editor') THEN
$inv_hunk$),
    (63, 'rename_folder(uuid,text,uuid)', false, $inv_hunk$       AND NOT iam.has_access('folder', p_new_parent_id, 'admin') THEN
$inv_hunk$, $inv_hunk$       AND NOT iam.has_access('folder', p_new_parent_id, 'editor') THEN
$inv_hunk$),
    (64, 'restore_file(uuid)', false, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'admin') THEN
$inv_hunk$, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'editor') THEN
$inv_hunk$),
    (65, 'restore_folder(uuid)', false, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'admin') THEN
$inv_hunk$, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'editor') THEN
$inv_hunk$),
    (66, 'share_resource_with_user(text,uuid,uuid,text)', false, $inv_hunk$  if p_permission_level is null or p_permission_level not in ('viewer', 'commenter', 'editor', 'admin') then
$inv_hunk$, $inv_hunk$  if p_permission_level is null or p_permission_level not in ('viewer', 'commenter', 'edit_content', 'editor', 'admin') then
$inv_hunk$),
    (67, 'share_with_audience(text,uuid,text,text[])', false, $inv_hunk$  if p_level is null or p_level not in ('viewer', 'commenter', 'editor', 'admin') then
$inv_hunk$, $inv_hunk$  if p_level is null or p_level not in ('viewer', 'commenter', 'edit_content', 'editor', 'admin') then
$inv_hunk$),
    (68, 'soft_delete_file(uuid)', false, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'admin') THEN
$inv_hunk$, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('file', p_file_id, 'editor') THEN
$inv_hunk$),
    (69, 'soft_delete_folder(uuid)', false, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'admin') THEN
$inv_hunk$, $inv_hunk$    IF auth.uid() IS NOT NULL AND NOT iam.has_access('folder', p_folder_id, 'editor') THEN
$inv_hunk$),
    (70, 'update_permission_level(text,uuid,uuid,uuid,text)', false, $inv_hunk$  IF p_new_level NOT IN ('viewer', 'commenter', 'editor', 'admin') THEN
$inv_hunk$, $inv_hunk$  IF p_new_level NOT IN ('viewer', 'commenter', 'edit_content', 'editor', 'admin') THEN
$inv_hunk$),
    (71, 'update_permission_level(text,uuid,uuid,uuid,text)', false, $inv_hunk$  IF iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, p_new_level::permission_level, CASE WHEN p_target_org_id IS NOT NULL THEN 'organization' ELSE 'person' END, COALESCE(p_target_org_id, p_target_user_id)) IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', iam.may_grant_as(v_uid, v_resolved.resource_type, p_resource_id, p_new_level::permission_level, CASE WHEN p_target_org_id IS NOT NULL THEN 'organization' ELSE 'person' END, COALESCE(p_target_org_id, p_target_user_id)));
$inv_hunk$, $inv_hunk$  IF NOT public.may_manage_sharing(v_resolved.resource_type, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'You need Admin on this to decide who else may see it. Ask whoever holds it, or an owner of the organization.');
$inv_hunk$)
  ) as t(ord, sig, optional, find, repl) order by ord loop
    v_def := pg_get_functiondef(r.sig::regprocedure);
    v_n := (length(v_def) - length(replace(v_def, r.find, ''))) / length(r.find);
    if v_n = 0 and r.optional then
      raise notice 'ONE-LADDER inverse: % - another lane has already rewritten the ladder''s spot here, left as it is (hunk %)', r.sig, r.ord;
      continue;
    end if;
    if v_n <> 1 then
      raise exception 'ONE-LADDER inverse: hunk % of % matched % place(s) in the live body (need exactly 1). Another lane changed the text this inverse reverses; nothing was undone for this function. Compare the body with the ladder file by hand.', r.ord, r.sig, v_n;
    end if;
    execute replace(v_def, r.find, r.repl);
  end loop;
end
$inv_patch$;

drop trigger if exists _a000_edit_content_is_editor on iam.permissions;
drop trigger if exists _a000_edit_content_is_editor on platform.share_links;
drop function if exists iam._edit_content_is_editor();
update iam.permissions set permission_level = 'edit_content' where id in ('11e79108-2858-440b-a1a3-26cae9819f61','1dbcf399-140d-4113-9525-1618a6684b82','1dfbda89-e435-49d7-94ab-85526ee55879','1f26ca16-eb13-4088-b5a0-dd4ae9f9c335','2a37a31b-5b2c-4e10-843d-e3b08f339235','4973f7ca-282e-4349-a0ea-9412bccf2c25','530ffb13-2d28-4e58-b311-3520b7aa739e','60277e13-1b8d-4aa6-a2b0-7621162536ce','70157d4f-a994-4368-9287-0614a95b88aa','707634f4-5419-40fb-9b3d-791c681be296','71caa56a-ff01-4c5c-a3d0-7007318e3715','744eff82-237d-48e3-8a4f-de43ff4360b0','7961a95d-3b7f-4f3d-857e-bac7a85be0ea','83698960-1bab-4268-9221-7dffe94203c5','8895c52a-b2cf-4d7b-afbd-29052d0142cb','9e168a9b-a138-4d10-99bb-0aadbe3c87b0','ae567a22-9809-4491-8605-f70f464b323b','b6e454ea-63a7-4bf6-b8bc-be93e00c43d3','b7c27786-676a-45f5-825e-a35635496d47','bdf0f794-1570-4151-ab43-8420ec9211a3','be2a88d9-94a7-4718-babf-6b6ec9beb207','c440ed26-38e9-49de-a412-d1db3dfac7bc','c780a4bd-9e0e-4baa-804e-36950bf4bd03','cd0aa1b6-92b5-4d78-ab78-5e33cc5361c4','d5a8f30a-b281-4d72-9791-457cd9c74328','dc06aa9e-57bc-4b62-ab8b-7d3e9d1a4b79','e1ae0c5a-a599-4317-aca8-1d4331f721c0','e2b04d1f-1c0e-43db-91c7-8b8a61f14f80') and permission_level = 'editor';

-- The two helpers (and their knobs / door rows) go only when nothing else reads them: later lanes
-- (platform.set_shown_to, custom.share_lane_set, iam.my_grantable_levels, ...) call iam.may_grant_as.
do $inv_tail$
declare v_others text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into v_others
    from pg_proc p
   where p.prokind in ('f', 'p')
     and (p.prosrc like '%may_grant_as%' or p.prosrc like '%holds_level_as%')
     and p.proname not in ('may_grant_as', 'holds_level_as');
  if v_others is null then
    drop function if exists iam.may_grant_as(uuid, text, uuid, public.permission_level, text, uuid);
    drop function if exists iam.holds_level_as(uuid, text, uuid, public.permission_level);
    delete from platform.feature_knob where feature = 'access.sharing' and key in ('editor_may_share','outside_org_min_level','confidential_min_level');
    delete from platform.client_callable_door where schema_name = 'iam' and function_name in ('may_grant_as', 'holds_level_as');
  else
    raise notice 'ONE-LADDER inverse: iam.may_grant_as / holds_level_as and the access.sharing knobs are KEPT, still called by: %', v_others;
  end if;
end
$inv_tail$;
