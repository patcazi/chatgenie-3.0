import os
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Path to the sample document
file_path = "sample.txt"

# Read the sample document
with open(file_path, "r") as file:
    document = file.read()

# Initialize the text splitter
text_splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)

# Split the document into chunks
chunks = text_splitter.split_text(document)

# Print the chunks for verification
print("Document Chunks:")
for i, chunk in enumerate(chunks, 1):
    print(f"Chunk {i}: {chunk}")