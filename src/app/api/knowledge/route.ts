import { NextRequest, NextResponse } from "next/server";
import { fileManager, fileSearchStoreId, listDocumentsFromStore, deleteDocumentFromStore } from "@/lib/gemini";
import fs from "fs";
import path from "path";
import os from "os";
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Helper para obter o usuário autenticado
async function getAuthenticatedUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user } } = await supabase.auth.getUser(token);
    return user;
}

export async function GET(req: NextRequest) {
    if (!fileManager || !fileSearchStoreId) {
        return NextResponse.json({ error: "Gemini API Key or Store ID missing" }, { status: 500 });
    }

    try {
        // Obter usuário autenticado
        const user = await getAuthenticatedUser(req);
        const tenantId = user?.id; // Usar o ID do usuário como tenant_id

        // Listar documentos do store, filtrando por tenant_id se disponível
        const response = await listDocumentsFromStore(tenantId);
        return NextResponse.json({ documents: response.documents || [] });
    } catch (error: any) {
        console.error("Error listing documents:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!fileManager || !fileSearchStoreId) {
        return NextResponse.json({ error: "Gemini API Key or Store ID missing" }, { status: 500 });
    }

    try {
        // Obter usuário autenticado
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert File to Buffer/Stream for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create a temporary path
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, file.name);
        fs.writeFileSync(tempFilePath, buffer);

        // Primeiro, fazer upload do arquivo para o File Manager
        const uploadResponse = await fileManager.uploadFile(tempFilePath, {
            mimeType: file.type,
            displayName: file.name,
        });

        // Cleanup temp file
        fs.unlinkSync(tempFilePath);

        // Agora importar para o FileSearchStore com metadata
        const apiKey = process.env.GEMINI_API_KEY;
        const importUrl = `https://generativelanguage.googleapis.com/v1beta/${fileSearchStoreId}:importFile?key=${apiKey}`;

        const importResponse = await fetch(importUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: uploadResponse.file.name,
                customMetadata: [
                    {
                        key: "tenant_id",
                        stringValue: user.id
                    }
                ]
            })
        });

        if (!importResponse.ok) {
            const errorData = await importResponse.json();
            throw new Error(`Failed to import file to store: ${JSON.stringify(errorData)}`);
        }

        const importData = await importResponse.json();

        return NextResponse.json({
            success: true,
            file: uploadResponse.file,
            operation: importData
        });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!fileSearchStoreId) {
        return NextResponse.json({ error: "Store ID missing" }, { status: 500 });
    }

    try {
        // Obter usuário autenticado
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const name = searchParams.get('name'); // This is the document name (fileSearchStores/.../documents/...)

        if (!name) {
            return NextResponse.json({ error: "Document name required" }, { status: 400 });
        }

        await deleteDocumentFromStore(name);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
