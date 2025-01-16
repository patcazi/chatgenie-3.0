import os
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Pinecone as LangchainPinecone
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
from pinecone import Pinecone
from docx import Document
from pypdf import PdfReader

# Load environment variables
load_dotenv()

# Get Pinecone and OpenAI credentials
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX_TWO")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize Pinecone with new syntax
pc = Pinecone(api_key=PINECONE_API_KEY)

def read_file(file_path):
    """Read different file types and return their text content"""
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.txt':
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
            
    elif file_extension == '.pdf':
        text = ""
        pdf = PdfReader(file_path)
        for page in pdf.pages:
            text += page.extract_text()
        return text
            
    elif file_extension in ['.docx', '.doc']:
        doc = Document(file_path)
        return ' '.join([paragraph.text for paragraph in doc.paragraphs])
            
    else:
        raise ValueError(f"Unsupported file type: {file_extension}")

def upload_document(file_path, namespace="chatgenie-user-data"):
    # Read the document content based on file type
    try:
        document = read_file(file_path)
    except Exception as e:
        raise Exception(f"Error reading file: {str(e)}")

    # Split the document into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)
    chunks = text_splitter.split_text(document)

    # Generate embeddings for the chunks
    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
    
    # Initialize LangChain's Pinecone wrapper with from_texts method
    vectorstore = LangchainPinecone.from_texts(
        texts=chunks,
        embedding=embeddings,
        index_name=PINECONE_INDEX,
        namespace=namespace
    )

    print(f"Successfully uploaded {len(chunks)} chunks to the Pinecone index.")

def main():
    # Check if the index exists
    if PINECONE_INDEX not in pc.list_indexes().names():
        raise ValueError(f"Index '{PINECONE_INDEX}' does not exist.")
    
    print("Supported file types: .txt, .pdf, .docx, .doc")
    # Prompt user for file upload
    file_path = input("Enter the path to the document you want to upload: ")
    if os.path.exists(file_path):
        try:
            upload_document(file_path)
        except Exception as e:
            print(f"Error processing file: {str(e)}")
    else:
        print("Invalid file path. Please try again.")

if __name__ == "__main__":
    main()