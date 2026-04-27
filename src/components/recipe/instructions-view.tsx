import type { TiptapDocument, TiptapNode, TiptapMark } from "@/types/recipe";

interface InstructionsViewProps {
  doc: TiptapDocument;
}

function applyMarks(content: React.ReactNode, marks: TiptapMark[]): React.ReactNode {
  return marks.reduce((acc, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong style={{ fontWeight: 600 }}>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "strike":
        return <s>{acc}</s>;
      case "code":
        return (
          <code
            style={{
              fontFamily: "monospace",
              fontSize: "0.9em",
              backgroundColor: "var(--bg-muted)",
              padding: "0.1em 0.3em",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {acc}
          </code>
        );
      default:
        return acc;
    }
  }, content);
}

function renderInlineNode(node: TiptapNode, key: string): React.ReactNode {
  switch (node.type) {
    case "text": {
      const text = node.text ?? "";
      return applyMarks(
        <span key={key}>{text}</span>,
        node.marks ?? []
      );
    }
    case "hardBreak":
      return <br key={key} />;
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={node.attrs?.src as string}
          alt={(node.attrs?.alt as string) ?? ""}
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: "var(--radius-lg)",
            margin: "0.75em 0",
            display: "block",
          }}
        />
      );
    default:
      return null;
  }
}

function renderBlockNode(node: TiptapNode, key: string): React.ReactNode {
  const inlineChildren = node.content?.map((n, i) =>
    renderInlineNode(n, `${key}-${i}`)
  );

  switch (node.type) {
    case "paragraph":
      return (
        <p
          key={key}
          dir="auto"
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1.0625rem",
            lineHeight: 1.8,
            color: "var(--ink-primary)",
            marginBottom: "0.75em",
          }}
        >
          {inlineChildren}
        </p>
      );

    case "heading": {
      const level = (node.attrs?.level as number) ?? 2;
      const sharedHeadingStyle: React.CSSProperties = {
        fontFamily: "var(--font-fraunces, Georgia, serif)",
        fontWeight: 500,
        color: "var(--ink-primary)",
        marginTop: "1.4em",
        marginBottom: "0.3em",
      };
      if (level === 2) {
        return (
          <h2
            key={key}
            style={{
              ...sharedHeadingStyle,
              fontSize: "1.375rem",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
            }}
          >
            {inlineChildren}
          </h2>
        );
      }
      if (level === 3) {
        return (
          <h3
            key={key}
            style={{
              ...sharedHeadingStyle,
              fontSize: "1.125rem",
              letterSpacing: "-0.005em",
              lineHeight: 1.4,
            }}
          >
            {inlineChildren}
          </h3>
        );
      }
      return (
        <h4
          key={key}
          style={{ ...sharedHeadingStyle, fontSize: "1rem" }}
        >
          {inlineChildren}
        </h4>
      );
    }

    case "bulletList":
      return (
        <ul
          key={key}
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1.0625rem",
            lineHeight: 1.8,
            color: "var(--ink-primary)",
            paddingLeft: "1.5em",
            marginBottom: "0.75em",
          }}
        >
          {node.content?.map((n, i) => renderBlockNode(n, `${key}-${i}`))}
        </ul>
      );

    case "orderedList":
      return (
        <ol
          key={key}
          style={{
            fontFamily: "var(--font-source-serif, Georgia, serif)",
            fontSize: "1.0625rem",
            lineHeight: 1.8,
            color: "var(--ink-primary)",
            paddingLeft: "1.5em",
            marginBottom: "0.75em",
          }}
        >
          {node.content?.map((n, i) => renderBlockNode(n, `${key}-${i}`))}
        </ol>
      );

    case "listItem":
      return (
        <li key={key} style={{ marginBottom: "0.25em" }} dir="auto">
          {node.content?.map((n, i) => renderBlockNode(n, `${key}-${i}`))}
        </li>
      );

    case "blockquote":
      return (
        <blockquote
          key={key}
          style={{
            borderLeft: "3px solid var(--accent-primary)",
            paddingLeft: "1em",
            marginLeft: 0,
            marginBottom: "0.75em",
            color: "var(--ink-secondary)",
            fontStyle: "italic",
          }}
        >
          {node.content?.map((n, i) => renderBlockNode(n, `${key}-${i}`))}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre
          key={key}
          style={{
            backgroundColor: "var(--bg-muted)",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            overflowX: "auto",
            marginBottom: "0.75em",
          }}
        >
          <code style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>
            {inlineChildren}
          </code>
        </pre>
      );

    case "horizontalRule":
      return (
        <hr
          key={key}
          style={{
            border: "none",
            borderTop: "1px solid var(--border-default)",
            margin: "1.5em 0",
          }}
        />
      );

    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={node.attrs?.src as string}
          alt={(node.attrs?.alt as string) ?? ""}
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: "var(--radius-lg)",
            margin: "1em 0",
            display: "block",
          }}
        />
      );

    default:
      return null;
  }
}

export function InstructionsView({ doc }: InstructionsViewProps) {
  if (!doc?.content?.length) {
    return (
      <p
        style={{
          color: "var(--ink-tertiary)",
          fontFamily: "var(--font-source-serif, Georgia, serif)",
        }}
      >
        No instructions yet.
      </p>
    );
  }

  const hasContent = doc.content.some(
    (node) =>
      node.type !== "paragraph" ||
      (node.content && node.content.length > 0)
  );

  if (!hasContent) {
    return (
      <p
        style={{
          color: "var(--ink-tertiary)",
          fontFamily: "var(--font-source-serif, Georgia, serif)",
        }}
      >
        No instructions yet.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: "var(--container-prose, 65ch)" }}>
      {doc.content.map((node, i) => renderBlockNode(node, `node-${i}`))}
    </div>
  );
}
