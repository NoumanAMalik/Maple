CREATE TABLE document_ops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version BIGINT NOT NULL,
    op_id TEXT NOT NULL,
    client_id TEXT,
    ops JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_document_ops_doc_version ON document_ops(document_id, version);
CREATE UNIQUE INDEX idx_document_ops_doc_op_id ON document_ops(document_id, op_id);
CREATE INDEX idx_document_ops_created_at ON document_ops(created_at);
