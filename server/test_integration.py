#!/usr/bin/env python3


import sys
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def test_integration():
    """Test that all components can be imported without errors."""
    
    logger.info("=" * 60)
    logger.info("Backend Integration Test")
    logger.info("=" * 60)
    
    try:
        # Test 1: Database connection
        logger.info("Test 1: Importing database client...")
        from database.supabase_client import supabase
        logger.info("✓ Database client imported successfully")
        
        # Test 2: CRUD operations
        logger.info("\nTest 2: Importing CRUD operations...")
        from crud.crud import (
            get_or_create_user,
            create_chat_session,
            store_message,
            get_messages,
            router as crud_router
        )
        logger.info("✓ CRUD functions imported successfully")
        logger.info(f"✓ CRUD router has {len(crud_router.routes)} route(s)")
        
        # Test 3: Main app
        logger.info("\nTest 3: Importing main FastAPI application...")
        from app import app, graph, model, search_tool
        logger.info("✓ FastAPI app imported successfully")
        logger.info(f"✓ App has {len(app.routes)} total route(s)")
        logger.info("✓ LangGraph graph compiled")
        logger.info("✓ LLM model initialized")
        logger.info("✓ Search tool initialized")
        
        # Test 4: Verify database connection
        logger.info("\nTest 4: Testing database connectivity...")
        result = supabase.table("users").select("id").limit(1).execute()
        logger.info(f"✓ Database query successful (returned {len(result.data)} row(s))")
        
        logger.info("\n" + "=" * 60)
        logger.info("All Integration Tests Passed! ✓")
        logger.info("=" * 60)
        logger.info("\nReady to run: python app.py")
        return True
        
    except Exception as e:
        logger.error(f"\n✗ Integration test failed: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    success = test_integration()
    sys.exit(0 if success else 1)
