import warnings
warnings.filterwarnings("ignore", message="urllib3 v2 only supports OpenSSL")

from supabase import create_client
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# --------------------------------
# Environment Configuration
# --------------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# --------------------------------
# Supabase Client Initialization
# Lazy initialization for serverless compatibility
# --------------------------------
supabase = None

def get_supabase():
    """Get or create Supabase client instance."""
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.error(
                "Missing required environment variables: "
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )
            raise ValueError("Database credentials not configured")
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized")
    return supabase

# Initialize eagerly if credentials are available
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.warning(f"Deferred Supabase initialization: {e}")