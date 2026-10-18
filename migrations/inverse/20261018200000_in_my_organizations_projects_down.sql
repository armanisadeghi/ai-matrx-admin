-- chair-step: drops the projects.projects overload of in_my_organizations added by 20261018200000 (scope tree reads would then fail with PGRST column-not-found).
drop function if exists projects.in_my_organizations(projects.projects);
notify pgrst, 'reload schema';
