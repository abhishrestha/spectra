import warnings
warnings.filterwarnings("ignore", message="urllib3 v2 only supports OpenSSL")

from supabase import create_client
import os
from dotenv import load_dotenv

# --------------------------------
# Environment Configuration
# --------------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# --------------------------------
# Validation: Fail fast if credentials missing
# --------------------------------
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Missing required environment variables: "
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
    )

# --------------------------------
# Supabase Client Initialization
# Single instance shared across the application
# --------------------------------
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)