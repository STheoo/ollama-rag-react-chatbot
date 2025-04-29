from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader

# Initialize FastAPI and configure server.
app = FastAPI()

origins = [
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize and create/get collection
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="docs")

def process_pdfs():

    # Load PDFs
    pdf_loader = DirectoryLoader(".//pdfs", glob="./*.pdf", loader_cls=PyPDFLoader)
    pdf_documents = pdf_loader.load()

    # Remove internal newlines or replace them with a space
    cleaned_text = " ".join(str(p.page_content).replace("\n", "") for p in pdf_documents)

    # Split documents into chunks of text.
    splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)
    docs = splitter.split_text(cleaned_text)

    # Add to collection and assign IDs.
    doc_ids = [f"doc_{i}" for i in range(len(docs))]
    collection.add(ids=doc_ids, documents=docs)


# process_pdfs()

# Validate query request with Pydantic.
class QueryRequest(BaseModel):
    query: str

# Set up /chat api route.
@app.post("/chat/")
async def chat(request: QueryRequest):
    query = request.query  # Retrieve the query from the request
    print(f"Received query: {query}")
    
    # Query ChromaDB with the provided query
    results = collection.query(query_texts=[query], n_results=10)
    
    # Construct context from the results
    context = "\n".join(results["documents"][0])
    
    print(f"Returning context: {context}")
    return {"context": context}