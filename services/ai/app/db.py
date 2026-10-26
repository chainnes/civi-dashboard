from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


class SupabaseNotConfiguredError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the AI service."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
