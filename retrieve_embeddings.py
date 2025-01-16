import os
from langchain_openai import OpenAIEmbeddings, ChatOpenAI  # Changed to import ChatOpenAI from langchain_openai
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from langchain.chains import RetrievalQA
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
    namespace="chatgenie-user-data"  # Match the namespace used during upload
)

# Initialize GPT model
llm = ChatOpenAI(openai_api_key=OPENAI_API_KEY, temperature=0)

# Set up the RAG pipeline
retrieval_qa = RetrievalQA.from_chain_type(
    retriever=vectorstore.as_retriever(),
    llm=llm
)

# Get a query from the user
query = input("Enter your query: ")

# Generate response using the RAG pipeline
print("\nGenerating response...")
response = retrieval_qa.invoke({"query": query})

# Display response
print("\nResponse:", response)