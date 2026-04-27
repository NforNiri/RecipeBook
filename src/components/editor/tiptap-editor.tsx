"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  ImageIcon,
} from "lucide-react";
import { createBrowserClient } from "@/lib/db/client";
import { validateAndCompressImage } from "@/lib/utils/image-compress";
import type { TiptapDocument } from "@/types/recipe";

interface TiptapEditorProps {
  defaultContent: TiptapDocument;
  onChange: (doc: TiptapDocument) => void;
}

const EDITOR_STYLES = `
.tiptap-recipe-editor .ProseMirror {
  padding: 16px;
  min-height: 220px;
  outline: none;
  font-family: var(--font-source-serif, Georgia, serif);
  font-size: 1rem;
  line-height: 1.8;
  color: var(--ink-primary);
}
.tiptap-recipe-editor .ProseMirror > * + * {
  margin-top: 0.6em;
}
.tiptap-recipe-editor .ProseMirror h2 {
  font-family: var(--font-fraunces, Georgia, serif);
  font-size: 1.375rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin-top: 1.4em;
  margin-bottom: 0.2em;
  line-height: 1.3;
}
.tiptap-recipe-editor .ProseMirror h3 {
  font-family: var(--font-fraunces, Georgia, serif);
  font-size: 1.125rem;
  font-weight: 500;
  letter-spacing: -0.005em;
  margin-top: 1.2em;
  margin-bottom: 0.2em;
  line-height: 1.4;
}
.tiptap-recipe-editor .ProseMirror ul,
.tiptap-recipe-editor .ProseMirror ol {
  padding-left: 1.5em;
}
.tiptap-recipe-editor .ProseMirror li + li {
  margin-top: 0.2em;
}
.tiptap-recipe-editor .ProseMirror hr {
  border: none;
  border-top: 1px solid var(--border-default);
  margin: 1.5em 0;
}
.tiptap-recipe-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
  margin: 0.75em 0;
  display: block;
}
.tiptap-recipe-editor .ProseMirror strong {
  font-weight: 600;
}
.tiptap-recipe-editor .ProseMirror em {
  font-style: italic;
}
.tiptap-recipe-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--ink-tertiary);
  pointer-events: none;
  height: 0;
}
`;

export function TiptapEditor({ defaultContent, onChange }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: defaultContent,
    editorProps: {
      attributes: {
        dir: "auto",
        "data-placeholder": "Write the recipe steps here…",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getJSON() as TiptapDocument);
    },
  });

  // Keep onChange reference stable — avoids editor recreation on parent re-renders.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  if (!editor) return null;

  const toolbarBtnStyle = (active = false): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: "var(--radius-sm)",
    border: "none",
    cursor: "pointer",
    backgroundColor: active ? "var(--accent-soft)" : "transparent",
    color: active ? "var(--accent-primary)" : "var(--ink-secondary)",
    transition: `background-color var(--duration-fast), color var(--duration-fast)`,
  });

  async function handleImageFile(file: File) {
    setImageError(null);
    setUploadingImage(true);
    try {
      const compressed = await validateAndCompressImage(file);

      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = compressed.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("recipes-images")
        .upload(path, compressed, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("recipes-images")
        .getPublicUrl(path);

      editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "Image upload failed. Please try again."
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <style>{EDITOR_STYLES}</style>

      <div
        className="tiptap-recipe-editor"
        style={{
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-muted)",
          overflow: "hidden",
        }}
      >
        {/* ── Toolbar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "6px 10px",
            borderBottom: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-surface)",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            title="Heading 2"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            style={toolbarBtnStyle(editor.isActive("heading", { level: 2 }))}
          >
            <Heading2 size={15} />
          </button>

          <button
            type="button"
            title="Heading 3"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            style={toolbarBtnStyle(editor.isActive("heading", { level: 3 }))}
          >
            <Heading3 size={15} />
          </button>

          <div
            style={{
              width: 1,
              height: 18,
              backgroundColor: "var(--border-default)",
              margin: "0 4px",
            }}
          />

          <button
            type="button"
            title="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={toolbarBtnStyle(editor.isActive("bold"))}
          >
            <Bold size={15} />
          </button>

          <button
            type="button"
            title="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={toolbarBtnStyle(editor.isActive("italic"))}
          >
            <Italic size={15} />
          </button>

          <div
            style={{
              width: 1,
              height: 18,
              backgroundColor: "var(--border-default)",
              margin: "0 4px",
            }}
          />

          <button
            type="button"
            title="Bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            style={toolbarBtnStyle(editor.isActive("bulletList"))}
          >
            <List size={15} />
          </button>

          <button
            type="button"
            title="Numbered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            style={toolbarBtnStyle(editor.isActive("orderedList"))}
          >
            <ListOrdered size={15} />
          </button>

          <div
            style={{
              width: 1,
              height: 18,
              backgroundColor: "var(--border-default)",
              margin: "0 4px",
            }}
          />

          <button
            type="button"
            title="Divider"
            onClick={() =>
              editor.chain().focus().setHorizontalRule().run()
            }
            style={toolbarBtnStyle()}
          >
            <Minus size={15} />
          </button>

          <button
            type="button"
            title={uploadingImage ? "Uploading…" : "Insert image"}
            disabled={uploadingImage}
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...toolbarBtnStyle(),
              opacity: uploadingImage ? 0.5 : 1,
              cursor: uploadingImage ? "wait" : "pointer",
            }}
          >
            <ImageIcon size={15} />
          </button>
        </div>

        {/* ── Editor canvas ── */}
        <EditorContent editor={editor} />
      </div>

      {imageError && (
        <p
          style={{
            marginTop: 4,
            fontFamily: "var(--font-inter, sans-serif)",
            fontSize: "0.8125rem",
            color: "var(--status-danger)",
          }}
        >
          {imageError}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />
    </>
  );
}
