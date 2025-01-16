import os
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from dotenv import load_dotenv
from pinecone import Pinecone

# Load environment variables
load_dotenv()

# Get Pinecone and OpenAI credentials
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX_TWO")  # Same index as in generate_embeddings.py
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize Pinecone with new syntax
pc = Pinecone(api_key=PINECONE_API_KEY)

# Connect to the Pinecone index
if PINECONE_INDEX not in pc.list_indexes().names():
    raise ValueError(f"Index '{PINECONE_INDEX}' does not exist.")
index = pc.Index(PINECONE_INDEX)

# Initialize LangChain's Pinecone wrapper and embeddings
embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
vectorstore = LangchainPinecone.from_existing_index(
    index_name=PINECONE_INDEX,
    embedding=embeddings,
    namespace="chatgenie-sample"  # Match the namespace used during embedding
)

# Get a query from the user
query = input("Enter your query: ")

# Generate embedding for the query
print("\nGenerating embedding for your query...")
retrieved_docs = vectorstore.similarity_search(query=query, k=5)  # Retrieve top 5 matches

# Display results
print("\nRetrieved Chunks:")
for i, doc in enumerate(retrieved_docs, 1):
    print(f"\nChunk {i}: {doc.page_content}")