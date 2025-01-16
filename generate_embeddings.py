import os
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

# Get Pinecone and OpenAI credentials
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX_TWO")  # Changed this line
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize Pinecone with serverless configuration
pc = Pinecone(api_key=PINECONE_API_KEY)

# Check if the index exists
if PINECONE_INDEX not in pc.list_indexes().names():
    print(f"Index '{PINECONE_INDEX}' does not exist. Please create it first.")
else:
    # Connect to the Pinecone index
    index = pc.Index(PINECONE_INDEX)
    
    # Load the sample document
    file_path = "sample.txt"
    with open(file_path, "r") as file:
        document = file.read()
    
    # Split the document into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)
    chunks = text_splitter.split_text(document)
    
    # Generate embeddings for the chunks
    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
    
    # Use LangChain's Pinecone wrapper to store embeddings
    vectorstore = LangchainPinecone.from_texts(
        texts=chunks,
        embedding=embeddings,
        index_name=PINECONE_INDEX,
        namespace="chatgenie-sample"  # Optional: add a namespace for organization
    )
    
    print(f"Successfully added {len(chunks)} chunks to the Pinecone index.")