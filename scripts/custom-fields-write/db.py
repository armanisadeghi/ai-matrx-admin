"""Shared connection for the custom-field write scripts. Run from aidream: `cd aidream && uv run python <script>`.
Reads SUPABASE_MATRIX_* from aidream/.env (never prints them). Test identity: admin@admin.com only."""
import os, json, psycopg
from dotenv import load_dotenv

load_dotenv(os.path.expanduser('~/code/aidream/.env'))
ADMIN = '87a6e699-3622-4869-8843-d0867456c0dd'  # admin@admin.com


def conn(autocommit=True):
    c = psycopg.connect(host=os.environ['SUPABASE_MATRIX_HOST'], port=5432,
                           dbname=os.environ['SUPABASE_MATRIX_DATABASE_NAME'], user=os.environ['SUPABASE_MATRIX_USER'],
                           password=os.environ['SUPABASE_MATRIX_PASSWORD'], autocommit=autocommit)
    c.prepare_threshold = None  # the pooler cannot keep prepared statements
    return c


def as_person(c, uid=ADMIN):
    """Inside a transaction: act as the person (authenticated role, jwt claims)."""
    c.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true)",
              (json.dumps({'sub': uid, 'role': 'authenticated', 'email': 'admin@admin.com'}), uid))
    c.execute("set local role authenticated")
