-- Book Chatbot RAG : stockage des passages vectorisés dans Supabase (pgvector).
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Dimension 3072 = taille des vecteurs produits par gemini-embedding-2 (mesurée).

create extension if not exists vector;

create table if not exists documents (
  id bigserial primary key,
  content text,          -- texte du passage (avec son en-tête d'augmentation)
  metadata jsonb,        -- bookId, bookTitle, chapter, passageNumber
  embedding vector(3072)
);

-- Recherche par livre (utilisée pour supprimer les anciens passages avant une réindexation).
create index if not exists documents_book_id_idx on documents ((metadata->>'bookId'));

-- Accès réservé à la clé service_role utilisée par n8n : aucune lecture publique.
alter table documents enable row level security;

-- Fonction appelée par le nœud Supabase Vector Store (queryName = match_documents).
create or replace function match_documents (
  query_embedding vector(3072),
  match_count int default null,
  filter jsonb default '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
