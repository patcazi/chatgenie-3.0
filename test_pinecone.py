import os
from pinecone import Pinecone
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Get Pinecone credentials from .env
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX")
PINECONE_ENV = os.getenv("PINECONE_ENV")

# Initialize Pinecone using the new API
pc = Pinecone(api_key=PINECONE_API_KEY)

try:
    # List all indexes
    index_list = pc.list_indexes().names()
    if PINECONE_INDEX not in index_list:
        print(f"Index '{PINECONE_INDEX}' does not exist.")
    else:
        # Retrieve stats for the existing index
        index = pc.Index(name=PINECONE_INDEX)
        stats = index.describe_index_stats()
        print("Pinecone Index Stats:", stats)
except Exception as e:
    print("Error connecting to Pinecone:", e)