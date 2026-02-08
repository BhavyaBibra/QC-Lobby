import time
import functools
from typing import TypeVar, Callable
from supabase import create_client, ClientOptions
from app.core.config import settings
import httpx

T = TypeVar('T')


def with_retry(max_retries: int = 3, base_delay: float = 0.5):
    """
    Retry decorator for transient Supabase/network errors.
    Uses exponential backoff: 0.5s, 1s, 2s
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (httpx.ReadError, httpx.ConnectError, httpx.TimeoutException) as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        print(f"[supabase] Retry {attempt + 1}/{max_retries} after {delay}s: {type(e).__name__}")
                        time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator


supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY,
    options=ClientOptions(
        postgrest_client_timeout=30,  # Increased from 20
    )
)
